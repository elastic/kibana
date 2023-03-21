/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import moment from 'moment';
import rison from '@kbn/rison';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { APP_ID as MAPS_APP_ID } from '@kbn/maps-plugin/common';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiProgress,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { MAPS_APP_LOCATOR } from '@kbn/maps-plugin/public';
import { mlJobService } from '../../services/job_service';
import { getDataViewIdFromName } from '../../util/index_utils';
import { getInitialAnomaliesLayers, getInitialSourceIndexFieldLayers } from '../../../maps/util';
import {
  formatHumanReadableDateTimeSeconds,
  timeFormatter,
} from '../../../../common/util/date_utils';
import { parseInterval } from '../../../../common/util/parse_interval';
import { ml } from '../../services/ml_api_service';
import { escapeKueryForFieldValuePair, replaceStringTokens } from '../../util/string_utils';
import { getUrlForRecord, openCustomUrlWindow } from '../../util/custom_url_utils';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../common/constants/locator';
import { SEARCH_QUERY_LANGUAGE } from '../../../../common/constants/search';
// @ts-ignore
import {
  escapeDoubleQuotes,
  getDateFormatTz,
  SourceIndicesWithGeoFields,
} from '../../explorer/explorer_utils';
import { isCategorizationAnomaly, isRuleSupported } from '../../../../common/util/anomaly_utils';
import { checkPermission } from '../../capabilities/check_capabilities';
import type {
  CustomUrlAnomalyRecordDoc,
  KibanaUrlConfig,
} from '../../../../common/types/custom_urls';
import type { TimeRangeBounds } from '../../util/time_buckets';
import { useMlKibana } from '../../contexts/kibana';
// @ts-ignore
import { getFieldTypeFromMapping } from '../../services/mapping_service';
import type { AnomaliesTableRecord } from '../../../../common/types/anomalies';
import { getQueryStringForInfluencers } from './get_query_string_for_influencers';
import { getFiltersForDSLQuery } from '../../../../common/util/job_utils';
interface LinksMenuProps {
  anomaly: AnomaliesTableRecord;
  bounds: TimeRangeBounds;
  showMapsLink: boolean;
  showViewSeriesLink: boolean;
  isAggregatedData: boolean;
  interval: 'day' | 'hour' | 'second';
  showRuleEditorFlyout: (anomaly: AnomaliesTableRecord) => void;
  onItemClick: () => void;
  sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
}

export const LinksMenuUI = (props: LinksMenuProps) => {
  const [openInDiscoverUrl, setOpenInDiscoverUrl] = useState<string | undefined>();
  const [discoverUrlError, setDiscoverUrlError] = useState<string | undefined>();

  const isCategorizationAnomalyRecord = isCategorizationAnomaly(props.anomaly);

  const closePopover = props.onItemClick;

  const kibana = useMlKibana();
  const {
    services: { data, share, application },
  } = kibana;

  const job = useMemo(() => {
    return mlJobService.getJob(props.anomaly.jobId);
  }, [props.anomaly.jobId]);

  const getAnomaliesMapsLink = async (anomaly: AnomaliesTableRecord) => {
    const index = job.datafeed_config.indices[0];
    const dataViewId = await getDataViewIdFromName(index);

    const initialLayers = getInitialAnomaliesLayers(anomaly.jobId);
    const anomalyBucketStartMoment = moment(anomaly.source.timestamp).tz(getDateFormatTz());
    const anomalyBucketStart = anomalyBucketStartMoment.toISOString();
    const anomalyBucketEnd = anomalyBucketStartMoment
      .add(anomaly.source.bucket_span, 'seconds')
      .subtract(1, 'ms')
      .toISOString();
    const timeRange = data.query.timefilter.timefilter.getTime();

    // Set 'from' in timeRange to start bucket time for the specific anomaly
    timeRange.from = anomalyBucketStart;
    timeRange.to = anomalyBucketEnd;

    const locator = share.url.locators.get(MAPS_APP_LOCATOR);
    const location = await locator?.getLocation({
      initialLayers,
      timeRange,
      ...(anomaly.entityName && anomaly.entityValue
        ? {
            query: {
              language: SEARCH_QUERY_LANGUAGE.KUERY,
              query: escapeKueryForFieldValuePair(anomaly.entityName, anomaly.entityValue),
            },
          }
        : {}),
      filters:
        dataViewId === null
          ? []
          : getFiltersForDSLQuery(job.datafeed_config.query, dataViewId, job.job_id),
    });
    return location;
  };

  const getAnomalySourceMapsLink = async (
    anomaly: AnomaliesTableRecord,
    sourceIndicesWithGeoFields: SourceIndicesWithGeoFields
  ) => {
    const index = job.datafeed_config.indices[0];
    const dataViewId = await getDataViewIdFromName(index);

    // Create a layer for each of the geoFields
    const initialLayers = getInitialSourceIndexFieldLayers(
      sourceIndicesWithGeoFields[anomaly.jobId]
    );
    // Widen the timerange by one bucket span on start/end to increase chances of always having data on the map
    const anomalyBucketStartMoment = moment(anomaly.source.timestamp).tz(getDateFormatTz());
    const anomalyBucketStart = anomalyBucketStartMoment
      .subtract(anomaly.source.bucket_span, 'seconds')
      .toISOString();
    const anomalyBucketEnd = anomalyBucketStartMoment
      .add(anomaly.source.bucket_span * 3, 'seconds')
      .subtract(1, 'ms')
      .toISOString();
    const timeRange = data.query.timefilter.timefilter.getTime();

    // Set 'from' in timeRange to start bucket time for the specific anomaly
    timeRange.from = anomalyBucketStart;
    timeRange.to = anomalyBucketEnd;

    // Create query string for influencers
    const influencersQueryString = getQueryStringForInfluencers(
      anomaly.influencers,
      anomaly.entityName
    );

    const locator = share.url.locators.get(MAPS_APP_LOCATOR);
    const filtersFromDatafeedQuery =
      dataViewId === null
        ? []
        : getFiltersForDSLQuery(job.datafeed_config.query, dataViewId, job.job_id);
    const location = await locator?.getLocation({
      initialLayers,
      timeRange,
      filters:
        filtersFromDatafeedQuery.length > 0
          ? filtersFromDatafeedQuery
          : data.query.filterManager.getFilters(),
      ...(anomaly.entityName && anomaly.entityValue
        ? {
            query: {
              language: SEARCH_QUERY_LANGUAGE.KUERY,
              query: `${escapeKueryForFieldValuePair(anomaly.entityName, anomaly.entityValue)}${
                influencersQueryString !== '' ? ` and (${influencersQueryString})` : ''
              }`,
            },
          }
        : {}),
    });
    return location;
  };

  useEffect(() => {
    let unmounted = false;
    const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

    if (!discoverLocator) {
      const discoverLocatorMissing = i18n.translate(
        'xpack.ml.anomaliesTable.linksMenu.discoverLocatorMissingErrorMessage',
        {
          defaultMessage: 'No locator for Discover detected',
        }
      );

      if (!unmounted) {
        setDiscoverUrlError(discoverLocatorMissing);
      }
      return;
    }

    const getDataViewId = async () => {
      const index = job.datafeed_config.indices[0];

      const dataViewId = await getDataViewIdFromName(index);

      // If data view doesn't exist for some reasons
      if (!dataViewId && !unmounted) {
        const autoGeneratedDiscoverLinkError = i18n.translate(
          'xpack.ml.anomaliesTable.linksMenu.autoGeneratedDiscoverLinkErrorMessage',
          {
            defaultMessage: `Unable to link to Discover; no data view exists for index '{index}'`,
            values: { index },
          }
        );

        setDiscoverUrlError(autoGeneratedDiscoverLinkError);
      }
      return dataViewId;
    };

    const generateDiscoverUrl = async () => {
      const interval = props.interval;

      const dataViewId = await getDataViewId();
      const record = props.anomaly.source;

      const earliestMoment = moment(record.timestamp).startOf(interval);
      if (interval === 'hour') {
        // Start from the previous hour.
        earliestMoment.subtract(1, 'h');
      }
      let latestMoment = moment(record.timestamp).add(record.bucket_span, 's');
      if (props.isAggregatedData === true) {
        latestMoment = moment(record.timestamp).endOf(interval);
        if (interval === 'hour') {
          // Show to the end of the next hour.
          latestMoment.add(1, 'h'); // e.g. 2016-02-08T18:59:59.999Z
        }
      }
      const from = timeFormatter(earliestMoment.unix() * 1000); // e.g. 2016-02-08T16:00:00.000Z
      const to = timeFormatter(latestMoment.unix() * 1000);

      let kqlQuery = '';

      if (record.influencers) {
        kqlQuery = record.influencers
          .map(
            (influencer) =>
              `"${influencer.influencer_field_name}":"${
                influencer.influencer_field_values[0] ?? ''
              }"`
          )
          .join(' AND ');
      }

      const url = await discoverLocator.getRedirectUrl({
        indexPatternId: dataViewId,
        timeRange: {
          from,
          to,
          mode: 'absolute',
        },
        query: {
          language: 'kuery',
          query: kqlQuery,
        },
        filters:
          dataViewId === null
            ? []
            : getFiltersForDSLQuery(job.datafeed_config.query, dataViewId, job.job_id),
      });

      if (!unmounted) {
        setOpenInDiscoverUrl(url);
      }
    };

    if (!isCategorizationAnomalyRecord) {
      generateDiscoverUrl();
    } else {
      getDataViewId();
    }

    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props.anomaly)]);

  const openCustomUrl = (customUrl: KibanaUrlConfig) => {
    const { anomaly, interval, isAggregatedData } = props;

    // eslint-disable-next-line no-console
    console.log('Anomalies Table - open customUrl for record:', anomaly);

    // If url_value contains $earliest$ and $latest$ tokens, add in times to the source record.
    // Create a copy of the record as we are adding properties into it.
    const record = cloneDeep(anomaly.source) as CustomUrlAnomalyRecordDoc;
    const timestamp = record.timestamp;
    const configuredUrlValue = customUrl.url_value;
    const timeRangeInterval =
      customUrl.time_range !== undefined ? parseInterval(customUrl.time_range) : null;
    const basePath = kibana.services.http.basePath.get();

    if (configuredUrlValue.includes('$earliest$')) {
      let earliestMoment = moment(timestamp);
      if (timeRangeInterval !== null) {
        earliestMoment.subtract(timeRangeInterval);
      } else {
        earliestMoment = moment(timestamp).startOf(interval);
        if (interval === 'hour') {
          // Start from the previous hour.
          earliestMoment.subtract(1, 'h');
        }
      }
      record.earliest = earliestMoment.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
    }

    if (configuredUrlValue.includes('$latest$')) {
      let latestMoment = moment(timestamp).add(record.bucket_span, 's');
      if (timeRangeInterval !== null) {
        latestMoment.add(timeRangeInterval);
      } else {
        if (isAggregatedData === true) {
          latestMoment = moment(timestamp).endOf(interval);
          if (interval === 'hour') {
            // Show to the end of the next hour.
            latestMoment.add(1, 'h'); // e.g. 2016-02-08T18:59:59.999Z
          }
        }
      }
      record.latest = latestMoment.toISOString();
    }

    // If url_value contains $mlcategoryterms$ or $mlcategoryregex$, add in the
    // terms and regex for the selected categoryId to the source record.
    if (
      (configuredUrlValue.includes('$mlcategoryterms$') ||
        configuredUrlValue.includes('$mlcategoryregex$')) &&
      record.mlcategory !== undefined
    ) {
      const jobId = record.job_id;

      // mlcategory in the source record will be an array
      // - use first value (will only ever be more than one if influenced by category other than by/partition/over).
      const categoryId = record.mlcategory[0];

      ml.results
        .getCategoryDefinition(jobId, categoryId)
        .then((resp) => {
          // Prefix each of the terms with '+' so that the Elasticsearch Query String query
          // run in a drilldown Kibana dashboard has to match on all terms.
          const termsArray = resp.terms.split(' ').map((term: string) => `+${term}`);
          record.mlcategoryterms = termsArray.join(' ');
          record.mlcategoryregex = resp.regex;

          // Replace any tokens in the configured url_value with values from the source record,
          // and then open link in a new tab/window.
          const urlPath = replaceStringTokens(customUrl.url_value, record, true);
          openCustomUrlWindow(urlPath, customUrl, basePath);
        })
        .catch((resp) => {
          // eslint-disable-next-line no-console
          console.log('openCustomUrl(): error loading categoryDefinition:', resp);
          const { toasts } = kibana.services.notifications;
          toasts.addDanger(
            i18n.translate('xpack.ml.anomaliesTable.linksMenu.unableToOpenLinkErrorMessage', {
              defaultMessage:
                'Unable to open link as an error occurred loading details on category ID {categoryId}',
              values: {
                categoryId,
              },
            })
          );
        });
    } else {
      // Replace any tokens in the configured url_value with values from the source record,
      // and then open link in a new tab/window.
      const urlPath = getUrlForRecord(customUrl, record as CustomUrlAnomalyRecordDoc);
      openCustomUrlWindow(urlPath, customUrl, basePath);
    }
  };

  const viewSeries = async () => {
    const mlLocator = share.url.locators.get(ML_APP_LOCATOR);

    const record = props.anomaly.source;
    const bounds = props.bounds;

    if (!mlLocator) {
      // eslint-disable-next-line no-console
      console.error('Unable to detect locator for ML or bounds');
      return;
    }

    if (!bounds || !bounds.min || !bounds.max) {
      // eslint-disable-next-line no-console
      console.error('Invalid bounds');
      return;
    }

    const from = bounds.min.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
    const to = bounds.max.toISOString();

    // Zoom to show 50 buckets either side of the record.
    const recordTime = moment(record.timestamp);
    const zoomFrom = recordTime.subtract(50 * record.bucket_span, 's').toISOString();
    const zoomTo = recordTime.add(100 * record.bucket_span, 's').toISOString();

    // Extract the by, over and partition fields for the record.
    const entityCondition: Record<string, string | number> = {};

    if (record.partition_field_name !== undefined && record.partition_field_value !== undefined) {
      entityCondition[record.partition_field_name] = record.partition_field_value;
    }

    if (record.over_field_name !== undefined && record.over_field_value !== undefined) {
      entityCondition[record.over_field_name] = record.over_field_value;
    }

    if (record.by_field_name !== undefined && record.by_field_value !== undefined) {
      // Note that analyses with by and over fields, will have a top-level by_field_name,
      // but the by_field_value(s) will be in the nested causes array.
      // TODO - drilldown from cause in expanded row only?
      entityCondition[record.by_field_name] = record.by_field_value;
    }

    const singleMetricViewerLink = await mlLocator.getUrl(
      {
        page: ML_PAGES.SINGLE_METRIC_VIEWER,
        pageState: {
          jobIds: [record.job_id],
          refreshInterval: {
            display: 'Off',
            pause: true,
            value: 0,
          },
          timeRange: {
            from,
            to,
            mode: 'absolute',
          },
          zoom: {
            from: zoomFrom,
            to: zoomTo,
          },
          detectorIndex: record.detector_index,
          entities: entityCondition,
          query_string: {
            analyze_wildcard: true,
            query: '*',
          },
        },
      },
      { absolute: true }
    );
    window.open(singleMetricViewerLink, '_blank');
  };

  const viewExamples = () => {
    const categoryId = props.anomaly.entityValue;
    const record = props.anomaly.source;

    if (job === undefined) {
      // eslint-disable-next-line no-console
      console.log(`viewExamples(): no job found with ID: ${props.anomaly.jobId}`);
      const { toasts } = kibana.services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.anomaliesTable.linksMenu.unableToViewExamplesErrorMessage', {
          defaultMessage: 'Unable to view examples as no details could be found for job ID {jobId}',
          values: {
            jobId: props.anomaly.jobId,
          },
        })
      );
      return;
    }
    const categorizationFieldName = job.analysis_config.categorization_field_name;
    const datafeedIndices = job.datafeed_config.indices;

    // Find the type of the categorization field i.e. text (preferred) or keyword.
    // Uses the first matching field found in the list of indices in the datafeed_config.
    // attempt to load the field type using each index. we have to do it this way as _field_caps
    // doesn't specify which index a field came from unless there is a clash.
    let i = 0;
    findFieldType(datafeedIndices[i]);

    const error = () => {
      // eslint-disable-next-line no-console
      console.log(
        `viewExamples(): error finding type of field ${categorizationFieldName} in indices:`,
        datafeedIndices
      );
      const { toasts } = kibana.services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.anomaliesTable.linksMenu.noMappingCouldBeFoundErrorMessage', {
          defaultMessage:
            'Unable to view examples of documents with mlcategory {categoryId} ' +
            'as no mapping could be found for the categorization field {categorizationFieldName}',
          values: {
            categoryId,
            categorizationFieldName,
          },
        })
      );
    };

    const createAndOpenUrl = (index: string, categorizationFieldType: string) => {
      // Get the definition of the category and use the terms or regex to view the
      // matching events in the Kibana Discover tab depending on whether the
      // categorization field is of mapping type text (preferred) or keyword.
      ml.results
        .getCategoryDefinition(record.job_id, categoryId)
        .then(async (resp) => {
          // Find the ID of the data view with a title attribute which matches the
          // index configured in the datafeed. If a Kibana data view has not been created
          // for this index, then the user will see a warning message on the Discover tab advising
          // them that no matching data view has been configured.
          const dataViewId = await getDataViewIdFromName(index);

          // We should not redirect to Discover if data view doesn't exist
          if (!dataViewId) return;

          let query = null;
          // Build query using categorization regex (if keyword type) or terms (if text type).
          // Check for terms or regex in case categoryId represents an anomaly from the absence of the
          // categorization field in documents (usually indicated by a categoryId of -1).
          if (categorizationFieldType === ES_FIELD_TYPES.KEYWORD) {
            if (resp.regex) {
              query = {
                language: SEARCH_QUERY_LANGUAGE.LUCENE,
                query: `${categorizationFieldName}:/${resp.regex}/`,
              };
            }
          } else {
            if (resp.terms) {
              const escapedTerms = escapeDoubleQuotes(resp.terms);
              query = {
                language: SEARCH_QUERY_LANGUAGE.KUERY,
                query:
                  `${categorizationFieldName}:"` +
                  escapedTerms.split(' ').join(`" and ${categorizationFieldName}:"`) +
                  '"',
              };
            }
          }

          const recordTime = moment(record.timestamp);
          const from = recordTime.toISOString();
          const to = recordTime.add(record.bucket_span, 's').toISOString();

          // Use rison to build the URL .
          const _g = rison.encode({
            refreshInterval: {
              display: 'Off',
              pause: true,
              value: 0,
            },
            time: {
              from,
              to,
              mode: 'absolute',
            },
          });

          const appStateProps = {
            index: dataViewId,
            filters: getFiltersForDSLQuery(job.datafeed_config.query, dataViewId, job.job_id),
            ...(query !== null
              ? {
                  query,
                }
              : {}),
          };
          const _a = rison.encode(appStateProps);

          // Need to encode the _a parameter as it will contain characters such as '+' if using the regex.
          const { basePath } = kibana.services.http;
          let path = basePath.get();
          path += '/app/discover#/';
          path += '?_g=' + _g;
          path += '&_a=' + encodeURIComponent(_a);
          window.open(path, '_blank');
        })
        .catch((resp) => {
          // eslint-disable-next-line no-console
          console.log('viewExamples(): error loading categoryDefinition:', resp);
          const { toasts } = kibana.services.notifications;
          toasts.addDanger(
            i18n.translate('xpack.ml.anomaliesTable.linksMenu.loadingDetailsErrorMessage', {
              defaultMessage:
                'Unable to view examples as an error occurred loading details on category ID {categoryId}',
              values: {
                categoryId,
              },
            })
          );
        });
    };

    function findFieldType(index: string) {
      getFieldTypeFromMapping(index, categorizationFieldName)
        .then((resp: string) => {
          if (resp !== '') {
            createAndOpenUrl(datafeedIndices.join(), resp);
          } else {
            i++;
            if (i < datafeedIndices.length) {
              findFieldType(datafeedIndices[i]);
            } else {
              error();
            }
          }
        })
        .catch(() => {
          error();
        });
    }
  };

  const { anomaly, showViewSeriesLink } = props;
  const canConfigureRules = isRuleSupported(anomaly.source) && checkPermission('canUpdateJob');

  const contextMenuItems = useMemo(() => {
    const items = [];
    if (anomaly.customUrls !== undefined) {
      anomaly.customUrls.forEach((customUrl, index) => {
        items.push(
          <EuiContextMenuItem
            key={`custom_url_${index}`}
            icon="popout"
            onClick={() => {
              closePopover();
              openCustomUrl(customUrl);
            }}
            data-test-subj={`mlAnomaliesListRowActionCustomUrlButton_${index}`}
          >
            {customUrl.url_name}
          </EuiContextMenuItem>
        );
      });
    }

    if (application.capabilities.discover?.show && !isCategorizationAnomalyRecord) {
      // Add item from the start, but disable it during the URL generation.
      const isLoading = discoverUrlError === undefined && openInDiscoverUrl === undefined;

      items.push(
        <EuiContextMenuItem
          key={`auto_raw_data_url`}
          icon="discoverApp"
          disabled={discoverUrlError !== undefined || isLoading}
          href={openInDiscoverUrl}
          data-test-subj={`mlAnomaliesListRowAction_viewInDiscoverButton`}
        >
          {discoverUrlError ? (
            <EuiToolTip content={discoverUrlError}>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.linksMenu.viewInDiscover"
                defaultMessage="View in Discover"
              />
            </EuiToolTip>
          ) : (
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewInDiscover"
              defaultMessage="View in Discover"
            />
          )}
          {isLoading ? <EuiProgress size={'xs'} color={'accent'} /> : null}
        </EuiContextMenuItem>
      );
    }
    if (showViewSeriesLink === true) {
      if (anomaly.isTimeSeriesViewRecord) {
        items.push(
          <EuiContextMenuItem
            key="view_series"
            icon="visLine"
            onClick={() => {
              closePopover();
              viewSeries();
            }}
            data-test-subj="mlAnomaliesListRowActionViewSeriesButton"
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewSeriesLabel"
              defaultMessage="View series"
            />
          </EuiContextMenuItem>
        );
      }
    }
    if (application.capabilities.maps?.show) {
      if (anomaly.isGeoRecord === true) {
        items.push(
          <EuiContextMenuItem
            key="view_in_maps"
            icon="gisApp"
            onClick={async () => {
              const mapsLink = await getAnomaliesMapsLink(anomaly);
              await application.navigateToApp(MAPS_APP_ID, { path: mapsLink?.path });
            }}
            data-test-subj="mlAnomaliesListRowActionViewInMapsButton"
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewInMapsLabel"
              defaultMessage="View in Maps"
            />
          </EuiContextMenuItem>
        );
      } else if (
        props.sourceIndicesWithGeoFields &&
        props.sourceIndicesWithGeoFields[anomaly.jobId]
      ) {
        items.push(
          <EuiContextMenuItem
            key="view_in_maps"
            icon="gisApp"
            onClick={async () => {
              const mapsLink = await getAnomalySourceMapsLink(
                anomaly,
                props.sourceIndicesWithGeoFields
              );
              await application.navigateToApp(MAPS_APP_ID, { path: mapsLink?.path });
            }}
            data-test-subj="mlAnomaliesListRowActionViewSourceIndexInMapsButton"
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewSourceIndexInMapsLabel"
              defaultMessage="View source index in Maps"
            />
          </EuiContextMenuItem>
        );
      }
    }

    if (application.capabilities.discover?.show && isCategorizationAnomalyRecord) {
      items.push(
        <EuiContextMenuItem
          key="view_examples"
          icon="popout"
          onClick={() => {
            closePopover();
            viewExamples();
          }}
          data-test-subj="mlAnomaliesListRowActionViewExamplesButton"
          disabled={discoverUrlError !== undefined}
        >
          {discoverUrlError !== undefined ? (
            <EuiToolTip content={discoverUrlError}>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.linksMenu.viewExamplesLabel"
                defaultMessage="View examples"
              />
            </EuiToolTip>
          ) : (
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewExamplesLabel"
              defaultMessage="View examples"
            />
          )}
        </EuiContextMenuItem>
      );
    }

    if (canConfigureRules) {
      items.push(
        <EuiContextMenuItem
          key="create_rule"
          icon="controlsHorizontal"
          onClick={() => {
            closePopover();
            props.showRuleEditorFlyout(anomaly);
          }}
          data-test-subj="mlAnomaliesListRowActionConfigureRulesButton"
        >
          <FormattedMessage
            id="xpack.ml.anomaliesTable.linksMenu.configureRulesLabel"
            defaultMessage="Configure job rules"
          />
        </EuiContextMenuItem>
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openInDiscoverUrl,
    discoverUrlError,
    viewExamples,
    viewSeries,
    canConfigureRules,
    isCategorizationAnomalyRecord,
  ]);

  return (
    <EuiContextMenuPanel items={contextMenuItems} data-test-subj="mlAnomaliesListRowActionsMenu" />
  );
};

export const LinksMenu: FC<Omit<LinksMenuProps, 'onItemClick'>> = (props) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const onButtonClick = setPopoverOpen.bind(null, !isPopoverOpen);
  const closePopover = setPopoverOpen.bind(null, false);

  const button = (
    <EuiButtonIcon
      size="s"
      color="text"
      onClick={onButtonClick}
      iconType="gear"
      aria-label={i18n.translate('xpack.ml.anomaliesTable.linksMenu.selectActionAriaLabel', {
        defaultMessage: 'Select action for anomaly at {time}',
        values: { time: formatHumanReadableDateTimeSeconds(props.anomaly.time) },
      })}
      data-test-subj="mlAnomaliesListRowActionsButton"
    />
  );

  return (
    <div>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <LinksMenuUI {...props} onItemClick={closePopover} />
      </EuiPopover>
    </div>
  );
};
