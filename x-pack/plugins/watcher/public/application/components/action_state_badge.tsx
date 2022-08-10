/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ACTION_STATES } from '../../../common/constants';

interface Props {
  state: string;
  size?: 'xs' | 's' | 'm';
}

const stateToIconMap = {
  [ACTION_STATES.FIRING]: <EuiIcon type="play" color="primary" />,
  [ACTION_STATES.OK]: <EuiIcon type="check" color="success" />,
  [ACTION_STATES.ACKNOWLEDGED]: <EuiIcon type="check" color="success" />,
  [ACTION_STATES.THROTTLED]: <EuiIcon type="clock" color="warning" />,
  [ACTION_STATES.UNKNOWN]: <EuiIcon type="cross" color="subdued" />,
  [ACTION_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="danger" />,
  [ACTION_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="danger" />,
};

export const ActionStateBadge = ({ state, size = 's' }: Props) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{stateToIconMap[state]}</EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size={size}>{state}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
