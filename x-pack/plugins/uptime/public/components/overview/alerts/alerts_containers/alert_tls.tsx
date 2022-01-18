/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback, useEffect } from 'react';
import { AlertTlsComponent } from '../alert_tls';
import { setAlertFlyoutVisible } from '../../../../state/actions';
import { selectDynamicSettings } from '../../../../state/selectors';
import { getDynamicSettings } from '../../../../state/actions/dynamic_settings';

export const AlertTls: React.FC<{}> = () => {
  const dispatch = useDispatch();
  const setFlyoutVisible = useCallback(
    (value: boolean) => dispatch(setAlertFlyoutVisible(value)),
    [dispatch]
  );
  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (typeof settings === 'undefined') {
      dispatch(getDynamicSettings());
    }
  }, [dispatch, settings]);

  return (
    <AlertTlsComponent
      ageThreshold={settings?.certAgeThreshold}
      expirationThreshold={settings?.certExpirationThreshold}
      setAlertFlyoutVisible={setFlyoutVisible}
    />
  );
};
