/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { i18n } from '@kbn/i18n';
import { ALERT_RULE_EXCEPTIONS_LIST, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type {
  ExceptionListId,
  ExceptionListIdentifiers,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';

import type { Filter } from '@kbn/es-query';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { createHistoryEntry } from '../../../../common/utils/global_query_string/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';
import { TimelineType } from '../../../../../common/api/timeline';
import { timelineActions } from '../../../../timelines/store';
import { sendAlertToTimelineAction } from '../actions';
import { useUpdateTimeline } from '../../../../timelines/components/open_timeline/use_update_timeline';
import { useCreateTimeline } from '../../../../timelines/hooks/use_create_timeline';
import type { CreateTimelineProps } from '../types';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../translations';
import { getField } from '../../../../helpers';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { ALERTS_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { defaultUdtHeaders } from '../../../../timelines/components/timeline/unified_components/default_headers';
import { defaultHeaders } from '../../../../timelines/components/timeline/body/column_headers/default_headers';

interface UseInvestigateInTimelineActionProps {
  ecsRowData?: Ecs | Ecs[] | null;
  onInvestigateInTimelineAlertClick?: () => void;
}

const detectionExceptionList = (ecsData: Ecs): ExceptionListId[] => {
  let exceptionsList = getField(ecsData, ALERT_RULE_EXCEPTIONS_LIST) ?? [];
  let detectionExceptionsList: ExceptionListId[] = [];
  try {
    if (Array.isArray(exceptionsList) && exceptionsList.length === 0) {
      const ruleParameters = getField(ecsData, ALERT_RULE_PARAMETERS) ?? {};
      if (ruleParameters.length > 0) {
        const parametersObject = JSON.parse(ruleParameters[0]);
        exceptionsList = parametersObject?.exceptions_list ?? [];
      }
    } else if (exceptionsList && exceptionsList.list_id) {
      return exceptionsList.list_id
        .map((listId: string, index: number) => {
          const type = exceptionsList.type[index];
          return {
            exception_list_id: listId,
            namespace_type: exceptionsList.namespace_type[index],
            type,
          };
        })
        .filter(
          (exception: ExceptionListIdentifiers) =>
            exception.type === ExceptionListTypeEnum.DETECTION
        );
    }
  } catch (error) {
    // do nothing, just fail silently as parametersObject is initialized
  }
  detectionExceptionsList = exceptionsList.reduce(
    (acc: ExceptionListId[], next: string | object) => {
      // parsed rule.parameters returns an object else use the default string representation
      try {
        const parsedList = typeof next === 'string' ? JSON.parse(next) : next;
        if (parsedList.type === ExceptionListTypeEnum.DETECTION) {
          const formattedList = {
            exception_list_id: parsedList.list_id,
            namespace_type: parsedList.namespace_type,
          };
          acc.push(formattedList);
        }
        // eslint-disable-next-line no-empty
      } catch {}

      return acc;
    },
    []
  );
  return detectionExceptionsList;
};

export const useInvestigateInTimeline = ({
  ecsRowData,
  onInvestigateInTimelineAlertClick,
}: UseInvestigateInTimelineActionProps) => {
  const { addError } = useAppToasts();
  const {
    data: { search: searchStrategyClient },
  } = useKibana().services;
  const dispatch = useDispatch();
  const { startTransaction } = useStartTransaction();

  const { services } = useKibana();
  const { getExceptionFilterFromIds } = useApi(services.http);

  const getExceptionFilter = useCallback(
    async (ecsData: Ecs): Promise<Filter | undefined> => {
      // This pulls exceptions list information from `_source` for timeline or the fields api for alerts.
      const detectionExceptionsLists = detectionExceptionList(ecsData);
      let exceptionFilter;
      if (detectionExceptionsLists.length > 0) {
        await getExceptionFilterFromIds({
          exceptionListIds: detectionExceptionsLists,
          excludeExceptions: true,
          chunkSize: 20,
          alias: 'Exceptions',
          onSuccess: (filter) => {
            exceptionFilter = filter;
          },
          onError: (err: string[]) => {
            addError(err, {
              title: i18n.translate(
                'xpack.securitySolution.detectionEngine.alerts.fetchExceptionFilterFailure',
                { defaultMessage: 'Error fetching exception filter.' }
              ),
            });
          },
        });
      }
      return exceptionFilter;
    },
    [addError, getExceptionFilterFromIds]
  );

  const updateTimelineIsLoading = useCallback(
    (payload) => dispatch(timelineActions.updateIsLoading(payload)),
    [dispatch]
  );

  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );
  const updateTimeline = useUpdateTimeline();

  const createTimeline = useCallback(
    async ({ from: fromTimeline, timeline, to: toTimeline, ruleNote }: CreateTimelineProps) => {
      await clearActiveTimeline();
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
      updateTimeline({
        duplicate: true,
        from: fromTimeline,
        id: TimelineId.active,
        notes: [],
        timeline: {
          ...timeline,
          columns: unifiedComponentsInTimelineEnabled ? defaultUdtHeaders : defaultHeaders,
          indexNames: timeline.indexNames ?? [],
          show: true,
        },
        to: toTimeline,
        ruleNote,
      });
    },
    [
      updateTimeline,
      updateTimelineIsLoading,
      clearActiveTimeline,
      unifiedComponentsInTimelineEnabled,
    ]
  );

  const investigateInTimelineAlertClick = useCallback(async () => {
    createHistoryEntry();

    startTransaction({ name: ALERTS_ACTIONS.INVESTIGATE_IN_TIMELINE });
    if (onInvestigateInTimelineAlertClick) {
      onInvestigateInTimelineAlertClick();
    }
    if (ecsRowData != null) {
      await sendAlertToTimelineAction({
        createTimeline,
        ecsData: ecsRowData,
        searchStrategyClient,
        updateTimelineIsLoading,
        getExceptionFilter,
      });
    }
  }, [
    startTransaction,
    createTimeline,
    ecsRowData,
    onInvestigateInTimelineAlertClick,
    searchStrategyClient,
    updateTimelineIsLoading,
    getExceptionFilter,
  ]);

  const investigateInTimelineActionItems = useMemo(
    () => [
      {
        key: 'investigate-in-timeline-action-item',
        'data-test-subj': 'investigate-in-timeline-action-item',
        disabled: ecsRowData == null,
        onClick: investigateInTimelineAlertClick,
        name: ACTION_INVESTIGATE_IN_TIMELINE,
      },
    ],
    [ecsRowData, investigateInTimelineAlertClick]
  );

  return {
    investigateInTimelineActionItems,
    investigateInTimelineAlertClick,
  };
};
