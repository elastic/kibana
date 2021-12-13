/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { EuiPortal } from '@elastic/eui';

import { FETCH_STATUS } from '../../../../../observability/public';

import { MONITOR_MANAGEMENT } from '../../../../common/constants';

import { Monitor } from '../../fleet_package/types';

import { ActionBar } from './action_bar';

interface Props {
  monitor: Monitor;
  isValid: boolean;
  onSave?: () => void;
}

export const ActionBarPortal = (props: Props) => {
  const portalSibling = document.getElementById('uptimeUIMonitorManagementBottomBarPortalSibling');

  return status === FETCH_STATUS.SUCCESS ? (
    <Redirect to={MONITOR_MANAGEMENT} />
  ) : portalSibling ? (
    <EuiPortal insert={{ sibling: portalSibling, position: 'after' }}>
      <ActionBar {...props} />
    </EuiPortal>
  ) : null;
};
