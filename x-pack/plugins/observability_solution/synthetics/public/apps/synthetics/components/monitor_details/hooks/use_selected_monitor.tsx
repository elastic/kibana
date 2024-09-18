/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ConfigKey, EncryptedSyntheticsSavedMonitor } from '../../../../../../common/runtime_types';
import { useSyntheticsRefreshContext } from '../../../contexts';
import {
  getMonitorAction,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
  selectorMonitorDetailsState,
  selectorError,
} from '../../../state';

export const useSelectedMonitor = (monId?: string) => {
  let monitorId = monId;
  const { monitorId: urlMonitorId } = useParams<{ monitorId: string }>();
  if (!monitorId) {
    monitorId = urlMonitorId;
  }
  const monitorsList = useSelector(selectEncryptedSyntheticsSavedMonitors);
  const { loading: monitorListLoading } = useSelector(selectMonitorListState);

  const monitorFromList = useMemo(
    () => monitorsList.find((monitor) => monitor[ConfigKey.CONFIG_ID] === monitorId) ?? null,
    [monitorId, monitorsList]
  );
  const error = useSelector(selectorError);
  const { lastRefresh, refreshInterval } = useSyntheticsRefreshContext();
  const { syntheticsMonitor, syntheticsMonitorLoading, syntheticsMonitorDispatchedAt } =
    useSelector(selectorMonitorDetailsState);
  const dispatch = useDispatch();

  const isMonitorFromListValid =
    monitorId && monitorFromList && monitorFromList[ConfigKey.CONFIG_ID] === monitorId;
  const isLoadedSyntheticsMonitorValid =
    monitorId && syntheticsMonitor && syntheticsMonitor[ConfigKey.CONFIG_ID] === monitorId;
  const availableMonitor: EncryptedSyntheticsSavedMonitor | null = isLoadedSyntheticsMonitorValid
    ? syntheticsMonitor
    : isMonitorFromListValid
    ? monitorFromList
    : null;

  const isMonitorMissing =
    error?.body.statusCode === 404 &&
    (error.getPayload as { monitorId: string })?.monitorId === monitorId;

  useEffect(() => {
    if (monitorId && !availableMonitor && !syntheticsMonitorLoading && !isMonitorMissing) {
      dispatch(getMonitorAction.get({ monitorId }));
    }
  }, [dispatch, monitorId, availableMonitor, syntheticsMonitorLoading, isMonitorMissing]);

  useEffect(() => {
    // Only perform periodic refresh if the last dispatch was earlier enough
    if (
      monitorId &&
      !syntheticsMonitorLoading &&
      !monitorListLoading &&
      syntheticsMonitorDispatchedAt > 0 &&
      Date.now() - syntheticsMonitorDispatchedAt > refreshInterval * 1000
    ) {
      dispatch(getMonitorAction.get({ monitorId }));
    }
  }, [
    dispatch,
    lastRefresh,
    refreshInterval,
    monitorId,
    monitorListLoading,
    syntheticsMonitorLoading,
    syntheticsMonitorDispatchedAt,
  ]);

  return {
    monitor: availableMonitor,
    loading: syntheticsMonitorLoading || monitorListLoading,
    error,
    isMonitorMissing,
  };
};
