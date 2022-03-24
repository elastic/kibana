/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { getOr, isEmpty } from 'lodash/fp';
import moment from 'moment';

import dateMath from '@elastic/datemath';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { FilterStateStore, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import {
  ALERT_RULE_FROM,
  ALERT_RULE_TYPE,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
} from '@kbn/rule-data-utils';

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { buildExceptionFilter } from '@kbn/securitysolution-list-utils';

import {
  ALERT_ORIGINAL_TIME,
  ALERT_GROUP_ID,
  ALERT_RULE_TIMELINE_ID,
  ALERT_THRESHOLD_RESULT,
} from '../../../../common/field_maps/field_names';
import {
  TimelineId,
  TimelineResult,
  TimelineStatus,
  TimelineType,
} from '../../../../common/types/timeline';
import { updateAlertStatus } from '../../containers/detection_engine/alerts/api';
import {
  SendAlertToTimelineActionProps,
  ThresholdAggregationData,
  UpdateAlertStatusActionProps,
  CreateTimelineProps,
} from './types';
import { Ecs } from '../../../../common/ecs';
import {
  TimelineEventsDetailsItem,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsQueries,
} from '../../../../common/search_strategy/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import {
  omitTypenameInTimeline,
  formatTimelineResultToModel,
} from '../../../timelines/components/open_timeline/helpers';
import { convertKueryToElasticSearchQuery } from '../../../common/lib/keury';
import { getField, getFieldKey } from '../../../helpers';
import {
  isThresholdRule,
  replaceTemplateFieldFromQuery,
  replaceTemplateFieldFromMatchFilters,
  replaceTemplateFieldFromDataProviders,
} from './helpers';
import {
  DataProvider,
  QueryOperator,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { getTimelineTemplate } from '../../../timelines/containers/api';
import { KibanaServices } from '../../../common/lib/kibana';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../common/constants';
import { buildAlertsQuery, formatAlertToEcsSignal } from '../../../common/utils/alerts';
import {
  DEFAULT_FROM_MOMENT,
  DEFAULT_TO_MOMENT,
} from '../../../common/utils/default_date_settings';

export const getUpdateAlertsQuery = (eventIds: Readonly<string[]>) => {
  return {
    query: {
      bool: {
        filter: {
          terms: {
            _id: eventIds,
          },
        },
      },
    },
  };
};

export const updateAlertStatusAction = async ({
  query,
  alertIds,
  selectedStatus,
  setEventsLoading,
  setEventsDeleted,
  onAlertStatusUpdateSuccess,
  onAlertStatusUpdateFailure,
}: UpdateAlertStatusActionProps) => {
  try {
    setEventsLoading({ eventIds: alertIds, isLoading: true });

    const queryObject = query ? { query: JSON.parse(query) } : getUpdateAlertsQuery(alertIds);
    const response = await updateAlertStatus({ query: queryObject, status: selectedStatus });
    // TODO: Only delete those that were successfully updated from updatedRules
    setEventsDeleted({ eventIds: alertIds, isDeleted: true });

    if (response.version_conflicts && alertIds.length === 1) {
      throw new Error(
        i18n.translate(
          'xpack.securitySolution.detectionEngine.alerts.updateAlertStatusFailedSingleAlert',
          {
            defaultMessage: 'Failed to update alert because it was already being modified.',
          }
        )
      );
    }

    onAlertStatusUpdateSuccess(
      response.updated ?? 0,
      response.version_conflicts ?? 0,
      selectedStatus
    );
  } catch (error) {
    onAlertStatusUpdateFailure(selectedStatus, error);
  } finally {
    setEventsLoading({ eventIds: alertIds, isLoading: false });
  }
};

export const determineToAndFrom = ({ ecs }: { ecs: Ecs[] | Ecs }) => {
  if (Array.isArray(ecs)) {
    const timestamps = ecs.reduce<number[]>((acc, item) => {
      const dateTimestamp = item.timestamp ? new Date(item.timestamp) : new Date();
      if (!acc.includes(dateTimestamp.valueOf())) {
        return [...acc, dateTimestamp.valueOf()];
      }
      return acc;
    }, []);
    return {
      from: new Date(Math.min(...timestamps)).toISOString(),
      to: new Date(Math.max(...timestamps)).toISOString(),
    };
  }
  const ecsData = ecs as Ecs;
  const ruleFrom = getField(ecsData, ALERT_RULE_FROM);
  const elapsedTimeRule = moment.duration(
    moment().diff(dateMath.parse(ruleFrom != null ? ruleFrom[0] : 'now-1d'))
  );
  const from = moment(ecsData.timestamp ?? new Date())
    .subtract(elapsedTimeRule)
    .toISOString();
  const to = moment(ecsData.timestamp ?? new Date()).toISOString();

  return { to, from };
};

const getFiltersFromRule = (filters: string[]): Filter[] =>
  filters.reduce((acc, filterString) => {
    try {
      const objFilter: Filter = JSON.parse(filterString);
      return [...acc, objFilter];
    } catch (e) {
      return acc;
    }
  }, [] as Filter[]);

const calculateFromTimeFallback = (thresholdData: Ecs, originalTime: moment.Moment) => {
  // relative time that the rule's time range starts at (e.g. now-1h)

  const ruleFromValue = getField(thresholdData, ALERT_RULE_FROM);
  const normalizedRuleFromValue = Array.isArray(ruleFromValue) ? ruleFromValue[0] : ruleFromValue;
  const ruleFrom = dateMath.parse(normalizedRuleFromValue);

  // get the absolute (moment.duration) interval by subtracting `ruleFrom` from `now`
  const now = moment();
  const ruleInterval = moment.duration(now.diff(ruleFrom));

  // subtract the rule interval from the time the alert was generated... this will
  // overshoot and potentially contain false positives in the timeline results
  return originalTime.clone().subtract(ruleInterval);
};

export const getThresholdAggregationData = (ecsData: Ecs | Ecs[]): ThresholdAggregationData => {
  const thresholdEcsData: Ecs[] = Array.isArray(ecsData) ? ecsData : [ecsData];
  return thresholdEcsData.reduce<ThresholdAggregationData>(
    (outerAcc, thresholdData) => {
      const threshold =
        getField(thresholdData, `${ALERT_RULE_PARAMETERS}.threshold`) ??
        thresholdData.signal?.rule?.threshold;

      const thresholdResult: {
        terms: Array<{
          field: string;
          value: string;
        }>;
        count: number;
        from: string;
      } = getField(thresholdData, ALERT_THRESHOLD_RESULT);

      // timestamp representing when the alert was generated
      const originalTimeValue = getField(thresholdData, ALERT_ORIGINAL_TIME);
      const normalizedOriginalTimeValue = Array.isArray(originalTimeValue)
        ? originalTimeValue[0]
        : originalTimeValue;
      const originalTime = moment(normalizedOriginalTimeValue);

      /*
       * Compute the fallback interval when `threshold_result.from` is not available
       * (for pre-7.12 backcompat)
       */
      const fromOriginalTime = calculateFromTimeFallback(thresholdData, originalTime);

      const aggregationFields: string[] = Array.isArray(threshold.field)
        ? threshold.field
        : [threshold.field];

      return {
        thresholdFrom: thresholdResult.from ?? fromOriginalTime.toISOString(),
        thresholdTo: originalTime.toISOString(),
        dataProviders: [
          ...outerAcc.dataProviders,
          ...aggregationFields.reduce<DataProvider[]>((acc, aggregationField, i) => {
            const aggregationValue = thresholdResult.terms.filter(
              (term) => term.field === aggregationField
            )[0].value;
            const dataProviderValue = Array.isArray(aggregationValue)
              ? aggregationValue[0]
              : aggregationValue;

            if (!dataProviderValue) {
              return acc;
            }

            const aggregationFieldId = aggregationField.replace('.', '-');
            const dataProviderPartial = {
              id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-${aggregationFieldId}-${dataProviderValue}`,
              name: aggregationField,
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: aggregationField,
                value: dataProviderValue,
                operator: ':' as QueryOperator,
              },
            };

            if (i === 0) {
              return [
                ...acc,
                {
                  ...dataProviderPartial,
                  and: [],
                },
              ];
            } else {
              acc[0].and.push(dataProviderPartial);
              return acc;
            }
          }, []),
        ],
      };
    },
    { dataProviders: [], thresholdFrom: '', thresholdTo: '' } as ThresholdAggregationData
  );
};

export const isEqlRuleWithGroupId = (ecsData: Ecs): boolean => {
  const ruleType = getField(ecsData, ALERT_RULE_TYPE);
  const groupId = getField(ecsData, ALERT_GROUP_ID);
  const isEql = ruleType === 'eql' || (Array.isArray(ruleType) && ruleType[0] === 'eql');
  return isEql && groupId?.length > 0;
};

export const buildAlertsKqlFilter = (
  key: '_id' | 'signal.group.id' | 'kibana.alert.group.id',
  alertIds: string[]
): Filter[] => {
  return [
    {
      query: {
        bool: {
          filter: {
            ids: {
              values: alertIds,
            },
          },
        },
      },
      meta: {
        alias: 'Alert Ids',
        negate: false,
        disabled: false,
        type: 'phrases',
        key,
        value: alertIds.join(),
        params: alertIds,
      },
      $state: {
        store: FilterStateStore.APP_STATE,
      },
    },
  ];
};

const buildTimelineDataProviderOrFilter = (
  alertIds: string[],
  _id: string
): { filters: Filter[]; dataProviders: DataProvider[] } => {
  if (!isEmpty(alertIds) && Array.isArray(alertIds) && alertIds.length > 1) {
    return {
      filters: buildAlertsKqlFilter('_id', alertIds),
      dataProviders: [],
    };
  } else {
    return {
      filters: [],
      dataProviders: [
        {
          and: [],
          id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${_id}`,
          name: _id,
          enabled: true,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: '_id',
            value: _id,
            operator: ':' as const,
          },
        },
      ],
    };
  }
};

const buildEqlDataProviderOrFilter = (
  alertIds: string[],
  ecs: Ecs[] | Ecs
): { filters: Filter[]; dataProviders: DataProvider[] } => {
  if (!isEmpty(alertIds) && Array.isArray(ecs) && ecs.length > 1) {
    return {
      dataProviders: [],
      filters: buildAlertsKqlFilter(
        ALERT_GROUP_ID,
        ecs.reduce<string[]>((acc, ecsData) => {
          const alertGroupIdField = getField(ecsData, ALERT_GROUP_ID);
          const alertGroupId = Array.isArray(alertGroupIdField)
            ? alertGroupIdField[0]
            : alertGroupIdField;
          if (!acc.includes(alertGroupId)) {
            return [...acc, alertGroupId];
          }
          return acc;
        }, [])
      ),
    };
  } else if (!Array.isArray(ecs) || ecs.length === 1) {
    const ecsData = Array.isArray(ecs) ? ecs[0] : ecs;
    const alertGroupIdField = getField(ecsData, ALERT_GROUP_ID);
    const queryMatchField = getFieldKey(ecsData, ALERT_GROUP_ID);
    const alertGroupId = Array.isArray(alertGroupIdField)
      ? alertGroupIdField[0]
      : alertGroupIdField;
    return {
      dataProviders: [
        {
          and: [],
          id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${alertGroupId}`,
          name: ecsData._id,
          enabled: true,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: queryMatchField,
            value: alertGroupId,
            operator: ':' as const,
          },
        },
      ],
      filters: [],
    };
  }
  return { filters: [], dataProviders: [] };
};

const createThresholdTimeline = async (
  ecsData: Ecs,
  createTimeline: ({ from, timeline, to }: CreateTimelineProps) => void,
  noteContent: string,
  templateValues: { filters?: Filter[]; query?: string; dataProviders?: DataProvider[] },
  getExceptions: (ecs: Ecs) => Promise<ExceptionListItemSchema[]>
) => {
  try {
    const alertResponse = await KibanaServices.get().http.fetch<
      estypes.SearchResponse<{ '@timestamp': string; [key: string]: unknown }>
    >(DETECTION_ENGINE_QUERY_SIGNALS_URL, {
      method: 'POST',
      body: JSON.stringify(buildAlertsQuery([ecsData._id])),
    });
    const formattedAlertData =
      alertResponse?.hits.hits.reduce<Ecs[]>((acc, { _id, _index, _source = {} }) => {
        return [
          ...acc,
          {
            ...formatAlertToEcsSignal(_source),
            _id,
            _index,
            timestamp: _source['@timestamp'],
          },
        ];
      }, []) ?? [];

    const alertDoc = formattedAlertData[0];
    const params = getField(alertDoc, ALERT_RULE_PARAMETERS);
    const filters = getFiltersFromRule(params.filters ?? alertDoc.signal?.rule?.filters) ?? [];
    const language = params.language ?? alertDoc.signal?.rule?.language ?? 'kuery';
    const query = params.query ?? alertDoc.signal?.rule?.query ?? '';
    const indexNames = params.index ?? alertDoc.signal?.rule?.index ?? [];

    const { thresholdFrom, thresholdTo, dataProviders } = getThresholdAggregationData(alertDoc);
    const exceptions = await getExceptions(ecsData);
    const exceptionsFilter =
      buildExceptionFilter({
        lists: exceptions,
        excludeExceptions: true,
        chunkSize: 10000,
      }) ?? [];
    const allFilters = (templateValues.filters ?? filters).concat(exceptionsFilter);

    return createTimeline({
      from: thresholdFrom,
      notes: null,
      timeline: {
        ...timelineDefaults,
        description: `_id: ${alertDoc._id}`,
        filters: allFilters,
        dataProviders: templateValues.dataProviders ?? dataProviders,
        id: TimelineId.active,
        indexNames,
        dateRange: {
          start: thresholdFrom,
          end: thresholdTo,
        },
        eventType: 'all',
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: language,
              expression: templateValues.query ?? query,
            },
            serializedQuery: templateValues.query ?? query,
          },
        },
      },
      to: thresholdTo,
      ruleNote: noteContent,
    });
  } catch (error) {
    const { toasts } = KibanaServices.get().notifications;
    toasts.addError(error, {
      toastMessage: i18n.translate(
        'xpack.securitySolution.detectionEngine.alerts.createThresholdTimelineFailure',
        {
          defaultMessage: 'Failed to create timeline for document _id: {id}',
          values: { id: ecsData._id },
        }
      ),
      title: i18n.translate(
        'xpack.securitySolution.detectionEngine.alerts.createThresholdTimelineFailureTitle',
        {
          defaultMessage: 'Failed to create theshold alert timeline',
        }
      ),
    });
    const from = DEFAULT_FROM_MOMENT.toISOString();
    const to = DEFAULT_TO_MOMENT.toISOString();
    return createTimeline({
      from,
      notes: null,
      timeline: {
        ...timelineDefaults,
        id: TimelineId.active,
        indexNames: [],
        dateRange: {
          start: from,
          end: to,
        },
        eventType: 'all',
      },
      to,
    });
  }
};

export const sendAlertToTimelineAction = async ({
  createTimeline,
  ecsData: ecs,
  updateTimelineIsLoading,
  searchStrategyClient,
  getExceptions,
}: SendAlertToTimelineActionProps) => {
  /* FUTURE DEVELOPER
   * We are making an assumption here that if you have an array of ecs data they are all coming from the same rule
   * but we still want to determine the filter for each alerts
   */
  const ecsData: Ecs = Array.isArray(ecs) && ecs.length > 0 ? ecs[0] : (ecs as Ecs);
  const alertIds = Array.isArray(ecs) ? ecs.map((d) => d._id) : [];
  const ruleNote = getField(ecsData, ALERT_RULE_NOTE);
  const noteContent = Array.isArray(ruleNote) && ruleNote.length > 0 ? ruleNote[0] : '';
  const ruleTimelineId = getField(ecsData, ALERT_RULE_TIMELINE_ID);
  const timelineId = !isEmpty(ruleTimelineId)
    ? Array.isArray(ruleTimelineId)
      ? ruleTimelineId[0]
      : ruleTimelineId
    : '';
  const { to, from } = determineToAndFrom({ ecs });

  // For now we do not want to populate the template timeline if we have alertIds
  if (!isEmpty(timelineId)) {
    try {
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: true });
      const [responseTimeline, eventDataResp] = await Promise.all([
        getTimelineTemplate(timelineId),
        searchStrategyClient
          .search<TimelineEventsDetailsRequestOptions, TimelineEventsDetailsStrategyResponse>(
            {
              defaultIndex: [],
              docValueFields: [],
              indexName: ecsData._index ?? '',
              eventId: ecsData._id,
              factoryQueryType: TimelineEventsQueries.details,
            },
            {
              strategy: 'timelineSearchStrategy',
            }
          )
          .toPromise(),
      ]);
      const resultingTimeline: TimelineResult = getOr({}, 'data.getOneTimeline', responseTimeline);
      const eventData: TimelineEventsDetailsItem[] = eventDataResp.data ?? [];
      if (!isEmpty(resultingTimeline)) {
        const timelineTemplate: TimelineResult = omitTypenameInTimeline(resultingTimeline);
        const { timeline, notes } = formatTimelineResultToModel(
          timelineTemplate,
          true,
          timelineTemplate.timelineType ?? TimelineType.default
        );
        const query = replaceTemplateFieldFromQuery(
          timeline.kqlQuery?.filterQuery?.kuery?.expression ?? '',
          eventData,
          timeline.timelineType
        );
        const filters = replaceTemplateFieldFromMatchFilters(timeline.filters ?? [], eventData);
        const dataProviders = replaceTemplateFieldFromDataProviders(
          timeline.dataProviders ?? [],
          eventData,
          timeline.timelineType
        );
        // threshold with template
        if (isThresholdRule(ecsData)) {
          return createThresholdTimeline(
            ecsData,
            createTimeline,
            noteContent,
            {
              filters,
              query,
              dataProviders,
            },
            getExceptions
          );
        } else {
          return createTimeline({
            from,
            timeline: {
              ...timeline,
              title: '',
              timelineType: TimelineType.default,
              templateTimelineId: null,
              status: TimelineStatus.draft,
              dataProviders,
              eventType: 'all',
              filters,
              dateRange: {
                start: from,
                end: to,
              },
              kqlQuery: {
                filterQuery: {
                  kuery: {
                    kind: timeline.kqlQuery?.filterQuery?.kuery?.kind ?? 'kuery',
                    expression: query,
                  },
                  serializedQuery: convertKueryToElasticSearchQuery(query),
                },
              },
              noteIds: notes?.map((n) => n.noteId) ?? [],
              show: true,
            },
            to,
            ruleNote: noteContent,
            notes: notes ?? null,
          });
        }
      }
    } catch {
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
      return createTimeline({
        from,
        notes: null,
        timeline: {
          ...timelineDefaults,
          id: TimelineId.active,
          indexNames: [],
          dateRange: {
            start: from,
            end: to,
          },
          eventType: 'all',
        },
        to,
      });
    }
  } else if (isThresholdRule(ecsData)) {
    return createThresholdTimeline(ecsData, createTimeline, noteContent, {}, getExceptions);
  } else {
    let { dataProviders, filters } = buildTimelineDataProviderOrFilter(alertIds ?? [], ecsData._id);
    if (isEqlRuleWithGroupId(ecsData)) {
      const tempEql = buildEqlDataProviderOrFilter(alertIds ?? [], ecs);
      dataProviders = tempEql.dataProviders;
      filters = tempEql.filters;
    }

    return createTimeline({
      from,
      notes: null,
      timeline: {
        ...timelineDefaults,
        dataProviders,
        id: TimelineId.active,
        indexNames: [],
        dateRange: {
          start: from,
          end: to,
        },
        eventType: 'all',
        filters,
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression: '',
            },
            serializedQuery: '',
          },
        },
      },
      to,
      ruleNote: noteContent,
    });
  }
};
