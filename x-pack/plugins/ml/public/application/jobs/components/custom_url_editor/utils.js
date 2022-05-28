/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_TYPE, URL_TYPE } from './constants';

import rison from 'rison-node';
import url from 'url';

import { getPartitioningFieldNames } from '../../../../../common/util/job_utils';
import { parseInterval } from '../../../../../common/util/parse_interval';
import { replaceTokensInUrlValue, isValidLabel } from '../../../util/custom_url_utils';
import { ml } from '../../../services/ml_api_service';
import { escapeForElasticsearchQuery } from '../../../util/string_utils';
import { getSavedObjectsClient, getDashboard } from '../../../util/dependency_cache';

export function getNewCustomUrlDefaults(job, dashboards, dataViews) {
  // Returns the settings object in the format used by the custom URL editor
  // for a new custom URL.
  const kibanaSettings = {
    queryFieldNames: [],
  };

  // Set the default type.
  let urlType = URL_TYPE.OTHER;
  if (dashboards !== undefined && dashboards.length > 0) {
    urlType = URL_TYPE.KIBANA_DASHBOARD;
    kibanaSettings.dashboardId = dashboards[0].id;
  } else if (dataViews !== undefined && dataViews.length > 0) {
    urlType = URL_TYPE.KIBANA_DISCOVER;
  }

  // For the Discover option, set the default data view to that
  // which matches the indices configured in the job datafeed.
  const datafeedConfig = job.datafeed_config;
  if (
    dataViews !== undefined &&
    dataViews.length > 0 &&
    datafeedConfig !== undefined &&
    datafeedConfig.indices !== undefined &&
    datafeedConfig.indices.length > 0
  ) {
    const indicesName = datafeedConfig.indices.join();
    const defaultDataViewId = dataViews.find((dv) => dv.title === indicesName)?.id;
    kibanaSettings.discoverIndexPatternId = defaultDataViewId;
  }

  return {
    label: '',
    type: urlType,
    // Note timeRange is only editable in new URLs for Dashboard and Discover URLs,
    // as for other URLs we have no way of knowing how the field will be used in the URL.
    timeRange: {
      type: TIME_RANGE_TYPE.AUTO,
      interval: '',
    },
    kibanaSettings,
    otherUrlSettings: {
      urlValue: '',
    },
  };
}

export function getQueryEntityFieldNames(job) {
  // Returns the list of partitioning and influencer field names that can be used
  // as entities to add to the query used when linking to a Kibana dashboard or Discover.
  const influencers = job.analysis_config.influencers;
  const detectors = job.analysis_config.detectors;
  const entityFieldNames = [];
  if (influencers !== undefined) {
    entityFieldNames.push(...influencers);
  }

  detectors.forEach((detector, detectorIndex) => {
    const partitioningFields = getPartitioningFieldNames(job, detectorIndex);

    partitioningFields.forEach((fieldName) => {
      if (entityFieldNames.indexOf(fieldName) === -1) {
        entityFieldNames.push(fieldName);
      }
    });
  });

  return entityFieldNames;
}

export function isValidCustomUrlSettingsTimeRange(timeRangeSettings) {
  if (timeRangeSettings.type === TIME_RANGE_TYPE.INTERVAL) {
    const interval = parseInterval(timeRangeSettings.interval);
    return interval !== null;
  }

  return true;
}

export function isValidCustomUrlSettings(settings, savedCustomUrls) {
  let isValid = isValidLabel(settings.label, savedCustomUrls);
  if (isValid === true) {
    isValid = isValidCustomUrlSettingsTimeRange(settings.timeRange);
  }
  return isValid;
}

export function buildCustomUrlFromSettings(settings) {
  // Dashboard URL returns a Promise as a query is made to obtain the full dashboard config.
  // So wrap the other two return types in a Promise for consistent return type.
  if (settings.type === URL_TYPE.KIBANA_DASHBOARD) {
    return buildDashboardUrlFromSettings(settings);
  } else if (settings.type === URL_TYPE.KIBANA_DISCOVER) {
    return Promise.resolve(buildDiscoverUrlFromSettings(settings));
  } else {
    const urlToAdd = {
      url_name: settings.label,
      url_value: settings.otherUrlSettings.urlValue,
    };

    return Promise.resolve(urlToAdd);
  }
}

function buildDashboardUrlFromSettings(settings) {
  // Get the complete list of attributes for the selected dashboard (query, filters).
  return new Promise((resolve, reject) => {
    const { dashboardId, queryFieldNames } = settings.kibanaSettings;

    const savedObjectsClient = getSavedObjectsClient();
    savedObjectsClient
      .get('dashboard', dashboardId)
      .then((response) => {
        // Use the filters from the saved dashboard if there are any.
        let filters = [];

        // Use the query from the dashboard only if no job entities are selected.
        let query = undefined;

        const searchSourceJSON = response.get('kibanaSavedObjectMeta.searchSourceJSON');
        if (searchSourceJSON !== undefined) {
          const searchSourceData = JSON.parse(searchSourceJSON);
          if (searchSourceData.filter !== undefined) {
            filters = searchSourceData.filter;
          }
          query = searchSourceData.query;
        }

        const queryFromEntityFieldNames = buildAppStateQueryParam(queryFieldNames);
        if (queryFromEntityFieldNames !== undefined) {
          query = queryFromEntityFieldNames;
        }

        const dashboard = getDashboard();

        dashboard.locator
          .getUrl({
            dashboardId,
            timeRange: {
              from: '$earliest$',
              to: '$latest$',
              mode: 'absolute',
            },
            filters,
            query,
            // Don't hash the URL since this string will be 1. shown to the user and 2. used as a
            // template to inject the time parameters.
            useHash: false,
          })
          .then((urlValue) => {
            const urlToAdd = {
              url_name: settings.label,
              url_value: decodeURIComponent(`dashboards${url.parse(urlValue).hash}`),
              time_range: TIME_RANGE_TYPE.AUTO,
            };

            if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
              urlToAdd.time_range = settings.timeRange.interval;
            }

            resolve(urlToAdd);
          });
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

function buildDiscoverUrlFromSettings(settings) {
  const { discoverIndexPatternId, queryFieldNames } = settings.kibanaSettings;

  // Add time settings to the global state URL parameter with $earliest$ and
  // $latest$ tokens which get substituted for times around the time of the
  // anomaly on which the URL will be run against.
  const _g = rison.encode({
    time: {
      from: '$earliest$',
      to: '$latest$',
      mode: 'absolute',
    },
  });

  // Add the index pattern and query to the appState part of the URL.
  const appState = {
    index: discoverIndexPatternId,
  };

  // If partitioning field entities have been configured add tokens
  // to the URL to use in the Discover page search.

  // Ideally we would put entities in the filters section, but currently this involves creating parameters of the form
  // filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b30fd340-efb4-11e7-a600-0f58b1422b87,
  // key:airline,negate:!f,params:(query:AAL,type:phrase),type:phrase,value:AAL),query:(match:(airline:(query:AAL,type:phrase)))))
  // which includes the ID of the index holding the field used in the filter.

  // So for simplicity, put entities in the query, replacing any query which is there already.
  // e.g. query:(language:kuery,query:'region:us-east-1%20and%20instance:i-20d061fa')
  const queryFromEntityFieldNames = buildAppStateQueryParam(queryFieldNames);
  if (queryFromEntityFieldNames !== undefined) {
    appState.query = queryFromEntityFieldNames;
  }

  const _a = rison.encode(appState);

  const urlValue = `discover#/?_g=${_g}&_a=${_a}`;

  const urlToAdd = {
    url_name: settings.label,
    url_value: urlValue,
    time_range: TIME_RANGE_TYPE.AUTO,
  };

  if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
    urlToAdd.time_range = settings.timeRange.interval;
  }

  return urlToAdd;
}

// Builds the query parameter for use in the _a AppState part of a Kibana Dashboard or Discover URL.
function buildAppStateQueryParam(queryFieldNames) {
  let queryParam;
  if (queryFieldNames !== undefined && queryFieldNames.length > 0) {
    let queryString = '';
    queryFieldNames.forEach((fieldName, i) => {
      if (i > 0) {
        queryString += ' and ';
      }
      queryString += `${escapeForElasticsearchQuery(fieldName)}:"$${fieldName}$"`;
    });

    queryParam = {
      language: 'kuery',
      query: queryString,
    };
  }

  return queryParam;
}

// Builds the full URL for testing out a custom URL configuration, which
// may contain dollar delimited partition / influencer entity tokens and
// drilldown time range settings.
export async function getTestUrl(job, customUrl) {
  const bucketSpanSecs = parseInterval(job.analysis_config.bucket_span).asSeconds();

  // By default, return configured url_value. Look to substitute any dollar-delimited
  // tokens with values from the highest scoring anomaly, or if no anomalies, with
  // values from a document returned by the search in the job datafeed.
  let testUrl = customUrl.url_value;

  // Query to look for the highest scoring anomaly.
  const body = {
    query: {
      bool: {
        must: [{ term: { job_id: job.job_id } }, { term: { result_type: 'record' } }],
      },
    },
    size: 1,
    _source: {
      excludes: [],
    },
    sort: [{ record_score: { order: 'desc' } }],
  };

  let resp;
  try {
    resp = await ml.results.anomalySearch(
      {
        body,
      },
      [job.job_id]
    );
  } catch (error) {
    // search may fail if the job doesn't already exist
    // ignore this error as the outer function call will raise a toast
  }

  if (resp && resp.hits.total.value > 0) {
    const record = resp.hits.hits[0]._source;
    testUrl = replaceTokensInUrlValue(customUrl, bucketSpanSecs, record, 'timestamp');
    return testUrl;
  } else {
    // No anomalies yet for this job, so do a preview of the search
    // configured in the job datafeed to obtain sample docs.

    let { datafeed_config: datafeedConfig, ...jobConfig } = job;
    try {
      // attempt load the non-combined job and datafeed so they can be used in the datafeed preview
      const [{ jobs }, { datafeeds }] = await Promise.all([
        ml.getJobs({ jobId: job.job_id }),
        ml.getDatafeeds({ datafeedId: job.datafeed_config.datafeed_id }),
      ]);
      datafeedConfig = datafeeds[0];
      jobConfig = jobs[0];
    } catch (error) {
      // jobs may not exist as this might be called from the AD job wizards
      // ignore this error as the outer function call will raise a toast
    }

    if (jobConfig === undefined || datafeedConfig === undefined) {
      return testUrl;
    }

    const preview = await ml.jobs.datafeedPreview(undefined, jobConfig, datafeedConfig);

    const docTimeFieldName = job.data_description.time_field;

    // Create a dummy object which contains the fields necessary to build the URL.
    const firstBucket = preview[0];
    if (firstBucket !== undefined) {
      testUrl = replaceTokensInUrlValue(customUrl, bucketSpanSecs, firstBucket, docTimeFieldName);
    }

    return testUrl;
  }
}
