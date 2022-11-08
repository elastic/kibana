/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import dateMath from '@elastic/datemath';
import { getOr, isEmpty } from 'lodash/fp';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

import { FilterStateStore, Filter } from '@kbn/es-query';
import {
  KueryFilterQueryKind,
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
} from './types';
import { Ecs } from '../../../../common/ecs';
import {
  TimelineNonEcsData,
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
import {
  replaceTemplateFieldFromQuery,
  replaceTemplateFieldFromMatchFilters,
  replaceTemplateFieldFromDataProviders,
} from './helpers';
import {
  DataProvider,
  QueryOperator,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { getTimelineTemplate } from '../../../timelines/containers/api';

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

export const getFilterAndRuleBounds = (
  data: TimelineNonEcsData[][]
): [string[], number, number] => {
  const stringFilter = data?.[0].filter((d) => d.field === 'signal.rule.filters')?.[0]?.value ?? [];

  const eventTimes = data
    .flatMap((alert) => alert.filter((d) => d.field === 'signal.original_time')?.[0]?.value ?? [])
    .map((d) => moment(d));

  return [stringFilter, moment.min(eventTimes).valueOf(), moment.max(eventTimes).valueOf()];
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
      if (item.timestamp != null) {
        const dateTimestamp = new Date(item.timestamp);
        if (!acc.includes(dateTimestamp.valueOf())) {
          return [...acc, dateTimestamp.valueOf()];
        }
      }
      return acc;
    }, []);
    return {
      from: new Date(Math.min(...timestamps)).toISOString(),
      to: new Date(Math.max(...timestamps)).toISOString(),
    };
  }
  const ecsData = ecs as Ecs;
  const elapsedTimeRule = moment.duration(
    moment().diff(
      dateMath.parse(ecsData?.signal?.rule?.from != null ? ecsData.signal?.rule?.from[0] : 'now-0s')
    )
  );
  const from = moment(ecsData?.timestamp ?? new Date())
    .subtract(elapsedTimeRule)
    .toISOString();
  const to = moment(ecsData?.timestamp ?? new Date()).toISOString();

  return { to, from };
};

const getFiltersFromRule = (filters: string[]): Filter[] =>
  filters.reduce((acc, filterString) => {
    try {
      const objFilter: Filter = JSON.parse(filterString);
      if (objFilter.meta === undefined) {
        objFilter.meta = {};
      }
      return [...acc, objFilter];
    } catch (e) {
      return acc;
    }
  }, [] as Filter[]);

export const getThresholdAggregationData = (
  ecsData: Ecs | Ecs[],
  nonEcsData: TimelineNonEcsData[]
): ThresholdAggregationData => {
  const thresholdEcsData: Ecs[] = Array.isArray(ecsData) ? ecsData : [ecsData];
  return thresholdEcsData.reduce<ThresholdAggregationData>(
    (outerAcc, thresholdData) => {
      const threshold = thresholdData.signal?.rule?.threshold as string[];

      let aggField: string[] = [];
      let thresholdResult: {
        terms?: Array<{
          field?: string;
          value: string;
        }>;
        count: number;
        from: string;
      };

      try {
        thresholdResult = JSON.parse((thresholdData.signal?.threshold_result as string[])[0]);
        aggField = JSON.parse(threshold[0]).field;
      } catch (err) {
        thresholdResult = {
          terms: [
            {
              field: (thresholdData.rule?.threshold as { field: string }).field,
              value: (thresholdData.signal?.threshold_result as { value: string }).value,
            },
          ],
          count: (thresholdData.signal?.threshold_result as { count: number }).count,
          from: (thresholdData.signal?.threshold_result as { from: string }).from,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const originalTime = moment(thresholdData.signal?.original_time![0]);
      const now = moment();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const ruleFrom = dateMath.parse(thresholdData.signal?.rule?.from![0]!);
      const ruleInterval = moment.duration(now.diff(ruleFrom));
      const fromOriginalTime = originalTime.clone().subtract(ruleInterval); // This is the default... can overshoot
      const aggregationFields = Array.isArray(aggField) ? aggField : [aggField];

      return {
        // Use `threshold_result.from` if available (it will always be available for new signals). Otherwise, use a calculated
        // lower bound, which could result in the timeline showing a superset of the events that made up the threshold set.
        thresholdFrom: thresholdResult.from ?? fromOriginalTime.toISOString(),
        thresholdTo: originalTime.toISOString(),
        dataProviders: [
          ...outerAcc.dataProviders,
          ...aggregationFields.reduce<DataProvider[]>((acc, aggregationField, i) => {
            const aggregationValue = (thresholdResult.terms ?? []).filter(
              (term: { field?: string | undefined; value: string }) =>
                term.field === aggregationField
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

export const isEqlRuleWithGroupId = (ecsData: Ecs) =>
  ecsData.signal?.rule?.type?.length &&
  ecsData.signal?.rule?.type[0] === 'eql' &&
  ecsData.signal?.group?.id?.length;

export const isThresholdRule = (ecsData: Ecs) =>
  ecsData.signal?.rule?.type?.length && ecsData.signal?.rule?.type[0] === 'threshold';

export const buildAlertsKqlFilter = (
  key: '_id' | 'signal.group.id',
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

export const buildTimelineDataProviderOrFilter = (
  alertsIds: string[],
  _id: string
): { filters: Filter[]; dataProviders: DataProvider[] } => {
  if (!isEmpty(alertsIds)) {
    return {
      dataProviders: [],
      filters: buildAlertsKqlFilter('_id', alertsIds),
    };
  }
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
};

export const buildEqlDataProviderOrFilter = (
  alertsIds: string[],
  ecs: Ecs[] | Ecs
): { filters: Filter[]; dataProviders: DataProvider[] } => {
  if (!isEmpty(alertsIds) && Array.isArray(ecs)) {
    return {
      dataProviders: [],
      filters: buildAlertsKqlFilter(
        'signal.group.id',
        ecs.reduce<string[]>((acc, ecsData) => {
          const signalGroupId = ecsData.signal?.group?.id?.length
            ? ecsData.signal?.group?.id[0]
            : 'unknown-signal-group-id';
          if (!acc.includes(signalGroupId)) {
            return [...acc, signalGroupId];
          }
          return acc;
        }, [])
      ),
    };
  } else if (!Array.isArray(ecs)) {
    const signalGroupId = ecs.signal?.group?.id?.length
      ? ecs.signal?.group?.id[0]
      : 'unknown-signal-group-id';
    return {
      dataProviders: [
        {
          and: [],
          id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${signalGroupId}`,
          name: ecs._id,
          enabled: true,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: 'signal.group.id',
            value: signalGroupId,
            operator: ':' as const,
          },
        },
      ],
      filters: [],
    };
  }
  return { filters: [], dataProviders: [] };
};

export const sendAlertToTimelineAction = async ({
  createTimeline,
  ecsData: ecs,
  nonEcsData,
  updateTimelineIsLoading,
  searchStrategyClient,
}: SendAlertToTimelineActionProps) => {
  /* FUTURE DEVELOPER
   * We are making an assumption here that if you have an array of ecs data they are all coming from the same rule
   * but we still want to determine the filter for each alerts
   */
  const ecsData: Ecs = Array.isArray(ecs) && ecs.length > 0 ? ecs[0] : (ecs as Ecs);
  const alertIds = Array.isArray(ecs) ? ecs.map((d) => d._id) : [];
  const noteContent = ecsData.signal?.rule?.note != null ? ecsData.signal?.rule?.note[0] : '';
  const timelineId =
    ecsData.signal?.rule?.timeline_id != null ? ecsData.signal?.rule?.timeline_id[0] : '';
  const { to, from } = determineToAndFrom({ ecs });

  // For now we do not want to populate the template timeline if we have alertIds
  if (!isEmpty(timelineId) && isEmpty(alertIds)) {
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
    } catch {
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
    }
  }

  if (isThresholdRule(ecsData)) {
    const { thresholdFrom, thresholdTo, dataProviders } = getThresholdAggregationData(
      ecsData,
      nonEcsData
    );

    return createTimeline({
      from: thresholdFrom,
      notes: null,
      timeline: {
        ...timelineDefaults,
        description: `_id: ${ecsData._id}`,
        filters: getFiltersFromRule(ecsData.signal?.rule?.filters as string[]),
        dataProviders,
        id: TimelineId.active,
        indexNames: [],
        dateRange: {
          start: thresholdFrom,
          end: thresholdTo,
        },
        eventType: 'all',
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: ecsData.signal?.rule?.language?.length
                ? (ecsData.signal?.rule?.language[0] as KueryFilterQueryKind)
                : 'kuery',
              expression: ecsData.signal?.rule?.query?.length ? ecsData.signal?.rule?.query[0] : '',
            },
            serializedQuery: ecsData.signal?.rule?.query?.length
              ? ecsData.signal?.rule?.query[0]
              : '',
          },
        },
      },
      to: thresholdTo,
      ruleNote: noteContent,
    });
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
