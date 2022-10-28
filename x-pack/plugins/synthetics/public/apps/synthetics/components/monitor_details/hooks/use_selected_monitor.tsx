/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ConfigKey } from '../../../../../../common/runtime_types';
import {
  getMonitorAction,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
  selectorMonitorDetailsState,
} from '../../../state';

export const useSelectedMonitor = () => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const monitorsList = useSelector(selectEncryptedSyntheticsSavedMonitors);
  const { loading: monitorListLoading } = useSelector(selectMonitorListState);
  const monitorFromList = useMemo(
    () => monitorsList.find((monitor) => monitor[ConfigKey.CONFIG_ID] === monitorId) ?? null,
    [monitorId, monitorsList]
  );
  const { syntheticsMonitor, syntheticsMonitorLoading } = useSelector(selectorMonitorDetailsState);
  const dispatch = useDispatch();

  const isMonitorFromListValid = monitorId && monitorFromList && monitorFromList?.id === monitorId;
  const isLoadedSyntheticsMonitorValid =
    monitorId && syntheticsMonitor && syntheticsMonitor?.id === monitorId;
  const availableMonitor = isLoadedSyntheticsMonitorValid
    ? syntheticsMonitor
    : isMonitorFromListValid
    ? monitorFromList
    : null;

  useEffect(() => {
    if (monitorId && !availableMonitor && !syntheticsMonitorLoading) {
      dispatch(getMonitorAction.get({ monitorId }));
    }
  }, [dispatch, monitorId, availableMonitor, syntheticsMonitorLoading]);

  return {
    monitor: availableMonitor,
    loading: syntheticsMonitorLoading || monitorListLoading,
  };
};
