/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAlertFlyoutVisibility,
  selectAlertFlyoutType,
  setAlertFlyoutVisible,
} from '../../../../state';
import { SyntheticsAlertsFlyoutWrapperComponent } from '../synthetics_alerts_flyout_wrapper';

export const SyntheticsAlertsFlyoutWrapper: React.FC = () => {
  const dispatch = useDispatch();
  const setAddFlyoutVisibility = (value: React.SetStateAction<boolean>) =>
    // @ts-ignore the value here is a boolean, and it works with the action creator function
    dispatch(setAlertFlyoutVisible(value));

  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);
  const alertTypeId = useSelector(selectAlertFlyoutType);

  return (
    <SyntheticsAlertsFlyoutWrapperComponent
      alertFlyoutVisible={alertFlyoutVisible}
      alertTypeId={alertTypeId}
      setAlertFlyoutVisibility={setAddFlyoutVisibility}
    />
  );
};
