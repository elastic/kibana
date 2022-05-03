/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { UiAction } from '../../../../state';
import {
  ToggleAlertFlyoutButtonComponent,
  ToggleAlertFlyoutButtonProps,
} from '../toggle_alert_flyout_button';

export const ToggleAlertFlyoutButton: React.FC<ToggleAlertFlyoutButtonProps> = (props) => {
  const dispatch = useDispatch();
  return (
    <ToggleAlertFlyoutButtonComponent
      {...props}
      setAlertFlyoutVisible={(value: boolean | string) => {
        if (typeof value === 'string') {
          dispatch(UiAction.setAlertFlyoutType(value));
          dispatch(UiAction.setAlertFlyoutVisible(true));
        } else {
          dispatch(UiAction.setAlertFlyoutVisible(value));
        }
      }}
    />
  );
};
