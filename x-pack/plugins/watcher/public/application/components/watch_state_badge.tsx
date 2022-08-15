/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { EuiTextProps } from '@elastic/eui';
import { WATCH_STATES } from '../../../common/constants';

interface Props {
  state: string;
  size?: EuiTextProps['size'];
}

const stateToIconMap = {
  [WATCH_STATES.ACTIVE]: <EuiIcon type="check" color="success" />,
  [WATCH_STATES.INACTIVE]: <EuiIcon type="minusInCircleFilled" color="subdued" />,
  [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="cross" color="subdued" />,
  [WATCH_STATES.ERROR]: <EuiIcon type="cross" color="subdued" />,
};

export const WatchStateBadge = ({ state, size = 's' }: Props) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{stateToIconMap[state]}</EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size={size}>{state}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
