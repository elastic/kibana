/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useBulkActionItems } from '@kbn/timelines-plugin/public';
import { timelineActions } from '../../../../timelines/store/timeline';
import { TableId, TimelineId } from '../../../../../common/types';
import { dataTableActions } from '../../../../common/store/data_table';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
interface Props {
  alertStatus?: Status;
  closePopover: () => void;
  eventId: string;
  scopeId: string;
  indexName: string;
  refetch?: () => void;
}

const isTimelineScope = (scopeId: string) =>
  Object.values(TimelineId).includes(scopeId as unknown as TimelineId);
const isInTableScope = (scopeId: string) =>
  Object.values(TableId).includes(scopeId as unknown as TableId);

export const useAlertsActions = ({
  alertStatus,
  closePopover,
  eventId,
  scopeId,
  indexName,
  refetch,
}: Props) => {
  const dispatch = useDispatch();
  const { hasIndexWrite } = useAlertsPrivileges();

  const onStatusUpdate = useCallback(() => {
    closePopover();
    if (refetch) {
      refetch();
    }
  }, [closePopover, refetch]);

  const setEventsLoading = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      if (isTimelineScope(scopeId)) {
        dispatch(timelineActions.setEventsLoading({ id: scopeId, eventIds, isLoading }));
      } else if (isInTableScope(scopeId)) {
        dispatch(dataTableActions.setEventsLoading({ id: scopeId, eventIds, isLoading }));
      }
    },
    [dispatch, scopeId]
  );

  const setEventsDeleted = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      if (isTimelineScope(scopeId)) {
        dispatch(timelineActions.setEventsDeleted({ id: scopeId, eventIds, isDeleted }));
      } else if (isInTableScope(scopeId)) {
        dispatch(dataTableActions.setEventsDeleted({ id: scopeId, eventIds, isDeleted }));
      }
    },
    [dispatch, scopeId]
  );

  const actionItems = useBulkActionItems({
    eventIds: [eventId],
    currentStatus: alertStatus,
    indexName,
    setEventsLoading,
    setEventsDeleted,
    onUpdateSuccess: onStatusUpdate,
    onUpdateFailure: onStatusUpdate,
    scopeId,
  });

  return {
    actionItems: hasIndexWrite ? actionItems : [],
  };
};
