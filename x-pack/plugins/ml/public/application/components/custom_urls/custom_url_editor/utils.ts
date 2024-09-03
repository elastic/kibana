/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import moment, { type Moment } from 'moment';
import { cloneDeep } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import url from 'url';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { cleanEmptyKeys } from '@kbn/dashboard-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { isFilterPinned } from '@kbn/es-query';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { TimeRange as EsQueryTimeRange } from '@kbn/es-query';
import type { MlKibanaUrlConfig, MlUrlConfig } from '@kbn/ml-anomaly-utils';
import {
  isDataFrameAnalyticsConfigs,
  type DataFrameAnalyticsConfig,
  DEFAULT_RESULTS_FIELD,
} from '@kbn/ml-data-frame-analytics-utils';

import { isDefined } from '@kbn/ml-is-defined';
import type { DashboardItems } from '../../../services/dashboard_service';
import { categoryFieldTypes } from '../../../../../common/util/fields_utils';
import { TIME_RANGE_TYPE, URL_TYPE } from './constants';

import {
  getPartitioningFieldNames,
  getFiltersForDSLQuery,
} from '../../../../../common/util/job_utils';
import { parseInterval } from '../../../../../common/util/parse_interval';
import { replaceStringTokens } from '../../../util/string_utils';
import {
  replaceTokensInUrlValue,
  replaceTokensInDFAUrlValue,
  isValidLabel,
} from '../../../util/custom_url_utils';
import { escapeForElasticsearchQuery } from '../../../util/string_utils';

import type { CombinedJob, Job } from '../../../../../common/types/anomaly_detection_jobs';
import { isAnomalyDetectionJob } from '../../../../../common/types/anomaly_detection_jobs';
import type { TimeRangeType } from './constants';
import type { MlApiServices } from '../../../services/ml_api_service';

export interface TimeRange {
  type: TimeRangeType;
  interval: string;
}

export interface CustomUrlSettings {
  label: string;
  type: string;
  // Note timeRange is only editable in new URLs for Dashboard and Discover URLs,
  // as for other URLs we have no way of knowing how the field will be used in the URL.
  timeRange: TimeRange;
  customTimeRange?: { start: Moment; end: Moment };
  kibanaSettings?: {
    dashboardId?: string;
    queryFieldNames?: string[];
    discoverIndexPatternId?: string;
    filters?: Filter[];
  };
  otherUrlSettings?: {
    urlValue: string;
  };
}

export function getNewCustomUrlDefaults(
  job: Job | DataFrameAnalyticsConfig,
  dashboards: DashboardItems,
  dataViews: DataViewListItem[],
  isPartialDFAJob?: boolean
): CustomUrlSettings {
  // Returns the settings object in the format used by the custom URL editor
  // for a new custom URL.
  const kibanaSettings: CustomUrlSettings['kibanaSettings'] = {
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
  let query: estypes.QueryDslQueryContainer = {};
  let indicesName: string | undefined;
  let backupIndicesName: string | undefined;
  let backupDataViewId: string | undefined;
  let jobId;

  if (
    isAnomalyDetectionJob(job) &&
    dataViews !== undefined &&
    dataViews.length > 0 &&
    job.datafeed_config !== undefined &&
    job.datafeed_config.indices !== undefined &&
    job.datafeed_config.indices.length > 0
  ) {
    indicesName = job.datafeed_config.indices.join();
    query = job.datafeed_config?.query ?? {};
    jobId = job.job_id;
  } else if (
    (isDataFrameAnalyticsConfigs(job) || isPartialDFAJob) &&
    dataViews !== undefined &&
    dataViews.length > 0
  ) {
    // Ensure cast as dfaJob if it's just a partial from the wizard
    const dfaJob = job as DataFrameAnalyticsConfig;
    const sourceIndex = Array.isArray(dfaJob.source.index)
      ? dfaJob.source.index.join()
      : dfaJob.source.index;

    indicesName = isPartialDFAJob ? sourceIndex : dfaJob.dest.index;
    backupIndicesName = sourceIndex;
    query = dfaJob.source?.query ?? {};
    jobId = dfaJob.id;
  }

  const defaultDataViewId = dataViews.find((dv) => dv.title === indicesName)?.id;
  if (defaultDataViewId === undefined && backupIndicesName !== undefined) {
    backupDataViewId = dataViews.find((dv) => dv.title === backupIndicesName)?.id;
  }
  kibanaSettings.discoverIndexPatternId = defaultDataViewId ?? backupDataViewId ?? '';
  kibanaSettings.filters =
    defaultDataViewId === null ? [] : getFiltersForDSLQuery(query, defaultDataViewId, jobId);

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

// Returns the list of supported field names that can be used
// to add to the query used when linking to a Kibana dashboard or Discover.
export function getSupportedFieldNames(
  job: DataFrameAnalyticsConfig | Job,
  dataView: DataView
): string[] {
  const sortedFields = dataView.fields.getAll().sort((a, b) => a.name.localeCompare(b.name)) ?? [];
  let filterFunction: (field: DataViewField) => boolean = (field: DataViewField) =>
    categoryFieldTypes.some((type) => {
      return field.esTypes?.includes(type);
    });

  if (isDataFrameAnalyticsConfigs(job)) {
    const resultsField = job.dest.results_field;
    filterFunction = (f) =>
      categoryFieldTypes.some((type) => {
        return f.esTypes?.includes(type);
      }) && !f.name.startsWith(resultsField ?? DEFAULT_RESULTS_FIELD);
  }
  const categoryFields = sortedFields.filter(filterFunction);
  return categoryFields.map((field) => field.name);
}

export function getQueryEntityFieldNames(job: Job): string[] {
  // Returns the list of partitioning and influencer field names that can be used
  // as entities to add to the query used when linking to a Kibana dashboard or Discover.
  const influencers = job.analysis_config.influencers;
  const detectors = job.analysis_config.detectors;
  const entityFieldNames: string[] = [];
  if (influencers !== undefined) {
    entityFieldNames.push(...influencers);
  }

  detectors.forEach((detector, detectorIndex) => {
    const partitioningFields = getPartitioningFieldNames(job as CombinedJob, detectorIndex);

    partitioningFields.forEach((fieldName) => {
      if (entityFieldNames.indexOf(fieldName) === -1) {
        entityFieldNames.push(fieldName);
      }
    });
  });

  return entityFieldNames;
}

export function isValidCustomUrlSettingsTimeRange(timeRangeSettings: TimeRange): boolean {
  if (timeRangeSettings.type === TIME_RANGE_TYPE.INTERVAL) {
    const interval = parseInterval(timeRangeSettings.interval);
    return interval !== null;
  }

  return true;
}

export function isValidCustomUrlSettings(
  settings: CustomUrlSettings,
  savedCustomUrls: MlUrlConfig[]
): boolean {
  let isValid = isValidLabel(settings.label, savedCustomUrls);
  if (isValid === true) {
    isValid = isValidCustomUrlSettingsTimeRange(settings.timeRange);
  }
  return isValid;
}

export function buildCustomUrlFromSettings(
  dashboardService: DashboardStart,
  settings: CustomUrlSettings
): Promise<MlUrlConfig> {
  // Dashboard URL returns a Promise as a query is made to obtain the full dashboard config.
  // So wrap the other two return types in a Promise for consistent return type.
  if (settings.type === URL_TYPE.KIBANA_DASHBOARD) {
    return buildDashboardUrlFromSettings(dashboardService, settings);
  } else if (settings.type === URL_TYPE.KIBANA_DISCOVER) {
    return Promise.resolve(buildDiscoverUrlFromSettings(settings));
  } else {
    const urlToAdd = {
      url_name: settings.label,
      url_value: settings.otherUrlSettings?.urlValue ?? '',
      ...(settings.customTimeRange ? { is_custom_time_range: true } : {}),
    };

    return Promise.resolve(urlToAdd);
  }
}

function getUrlRangeFromSettings(settings: CustomUrlSettings) {
  let customStart;
  let customEnd;

  if (settings.customTimeRange && settings.customTimeRange.start && settings.customTimeRange.end) {
    customStart = settings.customTimeRange.start.toISOString();
    customEnd = settings.customTimeRange.end.toISOString();
  }
  return {
    from: customStart ?? '$earliest$',
    to: customEnd ?? '$latest$',
  };
}

async function buildDashboardUrlFromSettings(
  dashboardService: DashboardStart,
  settings: CustomUrlSettings,
  isPartialDFAJob?: boolean
): Promise<MlUrlConfig> {
  // Get the complete list of attributes for the selected dashboard (query, filters).
  const { dashboardId, queryFieldNames } = settings.kibanaSettings ?? {};

  if (!dashboardService) {
    throw Error(`Missing dashboard service (got ${dashboardService})`);
  }
  if (!isDefined(dashboardId)) {
    throw Error(`DashboardId is invalid (got ${dashboardId})`);
  }

  const findDashboardsService = await dashboardService.findDashboardsService();
  const responses = await findDashboardsService.findByIds([dashboardId]);

  if (!responses || responses.length === 0 || responses[0].status === 'error') {
    throw Error(`Unable to find dashboard with id ${dashboardId} (got ${responses})`);
  }
  const dashboard = responses[0];

  // Query from the datafeed config will be saved as custom filters
  // Use them if there are set.
  let filters = settings?.kibanaSettings?.filters;

  // Use the query from the dashboard only if no job entities are selected.
  let query;

  // Override with filters and queries from saved dashboard if they are available.
  const searchSourceJSON = dashboard.attributes.kibanaSavedObjectMeta.searchSourceJSON;
  if (searchSourceJSON !== undefined) {
    const searchSourceData = JSON.parse(searchSourceJSON);
    if (Array.isArray(searchSourceData.filter) && searchSourceData.filter.length > 0) {
      filters = searchSourceData.filter;
    }
    query = searchSourceData.query;
  }

  const queryFromEntityFieldNames = buildAppStateQueryParam(queryFieldNames ?? []);
  if (queryFromEntityFieldNames !== undefined) {
    query = queryFromEntityFieldNames;
  }

  const { from, to } = getUrlRangeFromSettings(settings);

  const location = await dashboardService.locator?.getLocation({
    dashboardId,
    timeRange: {
      from,
      to,
      mode: 'absolute',
    },
    filters,
    query,
    // Don't hash the URL since this string will be 1. shown to the user and 2. used as a
    // template to inject the time parameters.
    useHash: false,
  });

  // Temp workaround
  const state: any = location?.state;
  const resultPath = setStateToKbnUrl(
    '_a',
    cleanEmptyKeys({
      query: state.query,
      filters: state.filters?.filter((f: Filter) => !isFilterPinned(f)),
      savedQuery: state.savedQuery,
    }),
    { useHash: false, storeInHashQuery: true },
    location?.path
  );

  const urlToAdd: MlUrlConfig = {
    url_name: settings.label,
    url_value: decodeURIComponent(`dashboards${url.parse(resultPath).hash}`),
    time_range: TIME_RANGE_TYPE.AUTO as string,
  };

  if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
    urlToAdd.time_range = settings.timeRange.interval;
  }

  if (settings.customTimeRange) {
    urlToAdd.is_custom_time_range = true;
  }

  return urlToAdd;
}

function buildDiscoverUrlFromSettings(settings: CustomUrlSettings) {
  const { discoverIndexPatternId, queryFieldNames, filters } = settings.kibanaSettings ?? {};

  // Add time settings to the global state URL parameter with $earliest$ and
  // $latest$ tokens which get substituted for times around the time of the
  // anomaly on which the URL will be run against.
  const { from, to } = getUrlRangeFromSettings(settings);

  const _g = rison.encode({
    time: {
      from,
      to,
      mode: 'absolute',
    },
  });

  // Add the index pattern and query to the appState part of the URL.
  const appState: SerializableRecord = {
    index: discoverIndexPatternId,
    filters,
  };
  // If partitioning field entities have been configured add tokens
  // to the URL to use in the Discover page search.

  // Ideally we would put entities in the filters section, but currently this involves creating parameters of the form
  // filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b30fd340-efb4-11e7-a600-0f58b1422b87,
  // key:airline,negate:!f,params:(query:AAL,type:phrase),type:phrase,value:AAL),query:(match:(airline:(query:AAL,type:phrase)))))
  // which includes the ID of the index holding the field used in the filter.

  // So for simplicity, put entities in the query, replacing any query which is there already.
  // e.g. query:(language:kuery,query:'region:us-east-1%20and%20instance:i-20d061fa')
  const queryFromEntityFieldNames = buildAppStateQueryParam(queryFieldNames ?? []);
  if (queryFromEntityFieldNames !== undefined) {
    appState.query = queryFromEntityFieldNames;
  }

  const _a = rison.encode(appState);

  const urlValue = `discover#/?_g=${_g}&_a=${_a}`;

  const urlToAdd: MlKibanaUrlConfig = {
    url_name: settings.label,
    url_value: urlValue,
    time_range: TIME_RANGE_TYPE.AUTO,
  };

  if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
    urlToAdd.time_range = settings.timeRange.interval;
  }

  if (settings.customTimeRange) {
    urlToAdd.is_custom_time_range = true;
  }

  return urlToAdd;
}

// Builds the query parameter for use in the _a AppState part of a Kibana Dashboard or Discover URL.
function buildAppStateQueryParam(queryFieldNames: string[]) {
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
async function getAnomalyDetectionJobTestUrl(
  ml: MlApiServices,
  job: Job,
  customUrl: MlUrlConfig
): Promise<string> {
  const interval = parseInterval(job.analysis_config.bucket_span!);
  const bucketSpanSecs = interval !== null ? interval.asSeconds() : 0;

  // By default, return configured url_value. Look to substitute any dollar-delimited
  // tokens with values from the highest scoring anomaly, or if no anomalies, with
  // values from a document returned by the search in the job datafeed.
  let testUrl = customUrl.url_value;

  // Query to look for the highest scoring anomaly.
  const body: estypes.SearchRequest['body'] = {
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

    let jobConfig = cloneDeep(job);
    let { datafeed_config: datafeedConfig } = jobConfig;
    try {
      // attempt load the non-combined job and datafeed so they can be used in the datafeed preview
      const [{ jobs }, { datafeeds }] = await Promise.all([
        ml.getJobs({ jobId: job.job_id }),
        ml.getDatafeeds({ datafeedId: job.datafeed_config?.datafeed_id ?? '' }),
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

    if (datafeedConfig.authorization !== undefined) {
      delete datafeedConfig.authorization;
    }
    if (datafeedConfig && jobConfig.datafeed_config !== undefined) {
      delete jobConfig.datafeed_config;
    }

    const preview = (await ml.jobs.datafeedPreview(
      undefined,
      jobConfig,
      datafeedConfig
      // @ts-expect-error TODO: fix after elasticsearch-js bump
    )) as unknown as estypes.MlPreviewDatafeedResponse<Record<string, unknown>>['data'];

    const docTimeFieldName = job.data_description.time_field;

    // Create a dummy object which contains the fields necessary to build the URL.
    const firstBucket = preview[0];
    if (firstBucket !== undefined) {
      testUrl = replaceTokensInUrlValue(customUrl, bucketSpanSecs, firstBucket, docTimeFieldName!);
    }

    return testUrl;
  }
}

async function getDataFrameAnalyticsTestUrl(
  ml: MlApiServices,
  job: DataFrameAnalyticsConfig,
  customUrl: MlKibanaUrlConfig,
  timeFieldName: string | null,
  currentTimeFilter?: EsQueryTimeRange,
  isPartialDFAJob?: boolean
): Promise<string> {
  // By default, return configured url_value. Look to substitute any dollar-delimited
  // tokens with values from a sample doc in the destination index
  const sourceIndex = Array.isArray(job.source.index) ? job.source.index.join() : job.source.index;
  let testUrl = customUrl.url_value;
  let record;
  let resp;

  try {
    const body = {
      // Use source index for partial job as there is no dest index yet
      index: isPartialDFAJob ? sourceIndex : job.dest.index,
      body: {
        size: 1,
      },
    };

    resp = await ml.esSearch(body);

    if (resp && resp.hits.total.value > 0) {
      record = resp.hits.hits[0]._source;
    } else {
      // No results for this job yet so use source index for example doc.
      resp = await ml.esSearch({
        index: Array.isArray(job.source.index) ? job.source.index.join(',') : job.source.index,
        body: {
          size: 1,
        },
      });

      record = resp?.hits?.hits[0]._source;
    }

    if (record) {
      const timeRangeInterval =
        customUrl.time_range !== undefined ? parseInterval(customUrl.time_range) : null;

      if (timeRangeInterval !== null && timeFieldName !== null) {
        const timestamp = record[timeFieldName];
        const configuredUrlValue = customUrl.url_value;

        if (configuredUrlValue.includes('$earliest$')) {
          const earliestMoment = moment(timestamp);
          earliestMoment.subtract(timeRangeInterval);
          record.earliest = earliestMoment.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
        }

        if (configuredUrlValue.includes('$latest$')) {
          const latestMoment = moment(timestamp);
          latestMoment.add(timeRangeInterval);
          record.latest = latestMoment.toISOString();
        }

        testUrl = replaceStringTokens(customUrl.url_value, record, true);
      } else {
        testUrl = replaceTokensInDFAUrlValue(customUrl, record, currentTimeFilter);
      }
    }
    return testUrl;
  } catch (error) {
    // search may fail if the job doesn't already exist
    // ignore this error as the outer function call will raise a toast
  }

  return testUrl;
}

export function getTestUrl(
  ml: MlApiServices,
  job: Job | DataFrameAnalyticsConfig,
  customUrl: MlUrlConfig,
  timeFieldName: string | null,
  currentTimeFilter?: EsQueryTimeRange,
  isPartialDFAJob?: boolean
) {
  if (isDataFrameAnalyticsConfigs(job) || isPartialDFAJob) {
    return getDataFrameAnalyticsTestUrl(
      ml,
      job as DataFrameAnalyticsConfig,
      customUrl,
      timeFieldName,
      currentTimeFilter,
      isPartialDFAJob
    );
  }

  return getAnomalyDetectionJobTestUrl(ml, job, customUrl);
}
