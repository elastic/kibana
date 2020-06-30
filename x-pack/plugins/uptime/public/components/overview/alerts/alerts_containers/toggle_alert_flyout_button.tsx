/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { setAlertFlyoutType, setAlertFlyoutVisible } from '../../../../state/actions';
import { ToggleAlertFlyoutButtonComponent } from '../index';

export interface ToggleAlertFlyoutButtonProps {
  alertOptions?: string[];
}

export const ToggleAlertFlyoutButton: React.FC<ToggleAlertFlyoutButtonProps> = (props) => {
  const dispatch = useDispatch();
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
