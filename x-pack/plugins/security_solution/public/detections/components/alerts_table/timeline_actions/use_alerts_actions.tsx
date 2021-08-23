/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useGetUserAlertsPermissions } from '@kbn/alerts';

import { useStatusBulkActionItems } from '../../../../../../timelines/public';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { timelineActions } from '../../../../timelines/store/timeline';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';

import { useKibana } from '../../../../common/lib/kibana';
import { SERVER_APP_ID } from '../../../../../common/constants';
interface Props {
  alertStatus?: Status;
  closePopover: () => void;
  eventId: string;
  timelineId: string;
  indexName: string;
  refetch?: () => void;
}

export const useAlertsActions = ({
  alertStatus,
  closePopover,
  eventId,
  timelineId,
  indexName,
  refetch,
}: Props) => {
  const dispatch = useDispatch();
  const uiCapabilities = useKibana().services.application.capabilities;
  const alertsPrivileges = useGetUserAlertsPermissions(uiCapabilities, SERVER_APP_ID);

  const onStatusUpdate = useCallback(() => {
    closePopover();
    if (refetch) {
      refetch();
    }
  }, [closePopover, refetch]);

  const setEventsLoading = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      dispatch(timelineActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      dispatch(timelineActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );

  const actionItems = useStatusBulkActionItems({
    eventIds: [eventId],
    currentStatus: alertStatus,
    indexName,
    setEventsLoading,
    setEventsDeleted,
    onUpdateSuccess: onStatusUpdate,
    onUpdateFailure: onStatusUpdate,
  });

  return {
    actionItems: alertsPrivileges.crud ? actionItems : [],
  };
};
