/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable complexity */

import dateMath from '@elastic/datemath';
import { get, getOr, isEmpty, find } from 'lodash/fp';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

import { TimelineId, TimelineStatus, TimelineType } from '../../../../common/types/timeline';
import { updateAlertStatus } from '../../containers/detection_engine/alerts/api';
import { SendAlertToTimelineActionProps, UpdateAlertStatusActionProps } from './types';
import { Ecs } from '../../../../common/ecs';
import { GetOneTimeline, TimelineResult } from '../../../graphql/types';
import {
  TimelineNonEcsData,
  TimelineEventsDetailsItem,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsQueries,
} from '../../../../common/search_strategy/timeline';
import { oneTimelineQuery } from '../../../timelines/containers/one/index.gql_query';
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
import { KueryFilterQueryKind } from '../../../common/store';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';

export const getUpdateAlertsQuery = (eventIds: Readonly<string[]>) => {
  return {
    query: {
      bool: {
        filter: {
          terms: {
            _id: [...eventIds],
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

    if (response.version_conflicts > 0 && alertIds.length === 1) {
      throw new Error(
        i18n.translate(
          'xpack.securitySolution.detectionEngine.alerts.updateAlertStatusFailedSingleAlert',
          {
            defaultMessage: 'Failed to update alert because it was already being modified.',
          }
        )
      );
    }

    onAlertStatusUpdateSuccess(response.updated, response.version_conflicts, selectedStatus);
  } catch (error) {
    onAlertStatusUpdateFailure(selectedStatus, error);
  } finally {
    setEventsLoading({ eventIds: alertIds, isLoading: false });
  }
};

export const determineToAndFrom = ({ ecsData }: { ecsData: Ecs }) => {
  const ellapsedTimeRule = moment.duration(
    moment().diff(
      dateMath.parse(ecsData.signal?.rule?.from != null ? ecsData.signal?.rule?.from[0] : 'now-0s')
    )
  );

  const from = moment(ecsData.timestamp ?? new Date())
    .subtract(ellapsedTimeRule)
    .toISOString();
  const to = moment(ecsData.timestamp ?? new Date()).toISOString();

  return { to, from };
};

export const getThresholdAggregationDataProvider = (
  ecsData: Ecs,
  nonEcsData: TimelineNonEcsData[]
): DataProvider[] => {
  const aggregationField = ecsData.signal?.rule?.threshold?.field!;
  const aggregationValue =
    get(aggregationField, ecsData) ?? find(['field', aggregationField], nonEcsData)?.value;
  const dataProviderValue = Array.isArray(aggregationValue)
    ? aggregationValue[0]
    : aggregationValue;

  if (!dataProviderValue) {
    return [];
  }

  const aggregationFieldId = aggregationField.replace('.', '-');

  return [
    {
      and: [],
      id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-${aggregationFieldId}-${dataProviderValue}`,
      name: aggregationField,
      enabled: true,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: aggregationField,
        value: dataProviderValue,
        operator: ':',
      },
    },
  ];
};

export const isEqlRuleWithGroupId = (ecsData: Ecs) =>
  ecsData.signal?.rule?.type?.length &&
  ecsData.signal?.rule?.type[0] === 'eql' &&
  ecsData.signal?.group?.id?.length;

export const isThresholdRule = (ecsData: Ecs) =>
  ecsData.signal?.rule?.type?.length && ecsData.signal?.rule?.type[0] === 'threshold';

export const sendAlertToTimelineAction = async ({
  apolloClient,
  createTimeline,
  ecsData,
  nonEcsData,
  updateTimelineIsLoading,
  searchStrategyClient,
}: SendAlertToTimelineActionProps) => {
  const noteContent = ecsData.signal?.rule?.note != null ? ecsData.signal?.rule?.note[0] : '';
  const timelineId =
    ecsData.signal?.rule?.timeline_id != null ? ecsData.signal?.rule?.timeline_id[0] : '';
  const { to, from } = determineToAndFrom({ ecsData });

  if (!isEmpty(timelineId) && apolloClient != null) {
    try {
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: true });
      const [responseTimeline, eventDataResp] = await Promise.all([
        apolloClient.query<GetOneTimeline.Query, GetOneTimeline.Variables>({
          query: oneTimelineQuery,
          fetchPolicy: 'no-cache',
          variables: {
            id: timelineId,
            timelineType: TimelineType.template,
          },
        }),
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
              strategy: 'securitySolutionTimelineSearchStrategy',
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
    return createTimeline({
      from,
      notes: null,
      timeline: {
        ...timelineDefaults,
        dataProviders: [
          {
            and: [],
            id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${ecsData._id}`,
            name: ecsData._id,
            enabled: true,
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: '_id',
              value: ecsData._id,
              operator: ':',
            },
          },
          ...getThresholdAggregationDataProvider(ecsData, nonEcsData),
        ],
        id: TimelineId.active,
        indexNames: [],
        dateRange: {
          start: from,
          end: to,
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
      to,
      ruleNote: noteContent,
    });
  } else {
    let dataProviders = [
      {
        and: [],
        id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${ecsData._id}`,
        name: ecsData._id,
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: '_id',
          value: ecsData._id,
          operator: ':' as const,
        },
      },
    ];
    if (isEqlRuleWithGroupId(ecsData)) {
      const signalGroupId = ecsData.signal?.group?.id?.length
        ? ecsData.signal?.group?.id[0]
        : 'unknown-signal-group-id';
      dataProviders = [
        {
          ...dataProviders[0],
          id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${signalGroupId}`,
          queryMatch: {
            field: 'signal.group.id',
            value: signalGroupId,
            operator: ':' as const,
          },
        },
      ];
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
