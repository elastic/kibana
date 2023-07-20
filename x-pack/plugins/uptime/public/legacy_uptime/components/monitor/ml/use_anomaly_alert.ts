/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAlertFlyoutVisibility } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { useMonitorId } from '../../../hooks';
import { anomalyAlertSelector, getAnomalyAlertAction } from '../../../state/alerts/alerts';

export const useAnomalyAlert = () => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const dispatch = useDispatch();

  const monitorId = useMonitorId();

  const { data: anomalyAlert } = useSelector(anomalyAlertSelector);

  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);

  useEffect(() => {
    dispatch(getAnomalyAlertAction.get({ monitorId }));
  }, [monitorId, lastRefresh, dispatch, alertFlyoutVisible]);

  return anomalyAlert;
};
