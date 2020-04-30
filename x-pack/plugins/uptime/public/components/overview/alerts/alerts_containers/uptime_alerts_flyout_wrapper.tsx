/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAlertFlyoutVisible } from '../../../../state/actions';
import { selectAlertFlyoutVisibility } from '../../../../state/selectors';
import { UptimeAlertsFlyoutWrapperComponent } from '../index';

interface Props {
  alertTypeId?: string;
  canChangeTrigger?: boolean;
}

export const UptimeAlertsFlyoutWrapper = ({ alertTypeId, canChangeTrigger }: Props) => {
  const dispatch = useDispatch();
  const setAddFlyoutVisibility = (value: React.SetStateAction<boolean>) =>
    // @ts-ignore the value here is a boolean, and it works with the action creator function
    dispatch(setAlertFlyoutVisible(value));

  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);

  return (
    <UptimeAlertsFlyoutWrapperComponent
      alertFlyoutVisible={alertFlyoutVisible}
      alertTypeId={alertTypeId}
      canChangeTrigger={canChangeTrigger}
      setAlertFlyoutVisibility={setAddFlyoutVisibility}
    />
  );
};
