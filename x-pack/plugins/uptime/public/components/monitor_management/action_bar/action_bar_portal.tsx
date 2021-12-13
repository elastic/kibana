/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import styled from 'styled-components';
import {
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiPortal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FETCH_STATUS, useFetcher } from '../../../../../observability/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

import { MONITOR_MANAGEMENT } from '../../../../common/constants';
import { setMonitor } from '../../../state/api';

import { Monitor } from '../../fleet_package/types';

import { ActionBar } from './action_bar';

interface Props {
  monitor: Monitor;
  isValid: boolean;
  onSave?: () => void;
}

const StyledPortal = styled(EuiPortal)`
  background-color: green;
`;

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
