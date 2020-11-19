/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';
import { setAlertFlyoutType, setAlertFlyoutVisible } from '../../../../state/actions';
import { ToggleAlertFlyoutButtonComponent } from '../index';
import { CLIENT_ALERT_TYPES } from '../../../../../common/constants/alerts';

export interface ToggleAlertFlyoutButtonProps {
  alertOptions?: string[];
}

export const ToggleAlertFlyoutButton: React.FC<ToggleAlertFlyoutButtonProps> = (props) => {
  const dispatch = useDispatch();

  const isCreateAlert = useRouteMatch('/status-alert/new');

  const isTlsAlert = useRouteMatch('/tls-alert/new');

  useEffect(() => {
    if (isCreateAlert) {
      dispatch(setAlertFlyoutType(CLIENT_ALERT_TYPES.MONITOR_STATUS));
      dispatch(setAlertFlyoutVisible(true));
    }
  }, [isCreateAlert, dispatch]);

  useEffect(() => {
    if (isTlsAlert) {
      dispatch(setAlertFlyoutType(CLIENT_ALERT_TYPES.TLS));
      dispatch(setAlertFlyoutVisible(true));
    }
  }, [isTlsAlert, dispatch]);

  return (
    <ToggleAlertFlyoutButtonComponent
      {...props}
      setAlertFlyoutVisible={(value: boolean | string) => {
        if (typeof value === 'string') {
          dispatch(setAlertFlyoutType(value));
          dispatch(setAlertFlyoutVisible(true));
        } else {
          dispatch(setAlertFlyoutVisible(value));
        }
      }}
    />
  );
};
