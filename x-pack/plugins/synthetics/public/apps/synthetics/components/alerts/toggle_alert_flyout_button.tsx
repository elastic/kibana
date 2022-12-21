/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { setAlertFlyoutType, setAlertFlyoutVisible } from '../../state';
import { ToggleAlertFlyoutButtonComponent } from './components/toggle_alert_flyout_component';

export const ToggleAlertFlyoutButton: React.FC = () => {
  const dispatch = useDispatch();
  return (
    <ToggleAlertFlyoutButtonComponent
      setAlertFlyoutType={(value: string) => dispatch(setAlertFlyoutType(value))}
      setAlertFlyoutVisible={(value: boolean) => {
        dispatch(setAlertFlyoutVisible(value));
      }}
    />
  );
};
