/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { StatelessComponent } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { ACTION_MAP, COLOR_MAP, LEVEL_MAP, REVERSE_LEVEL_MAP } from './constants';

interface DeprecationHealthProps {
  deprecations: DeprecationInfo[];
  single?: boolean;
}

/**
 * Displays a summary health for a list of deprecations that shows the number and level of highest severity
 * deprecations in the list.
 * TODO: Allow showing all severity levels
 */
export const DeprecationHealth: StatelessComponent<DeprecationHealthProps> = ({
  deprecations,
  single,
}) => {
  if (deprecations.length === 0) {
    return <span />;
  }

  const levels = deprecations.map(d => LEVEL_MAP[d.level]);
  const highest = Math.max(...levels);
  const highestLevel = REVERSE_LEVEL_MAP[highest];
  const numHighest = deprecations.filter(d => d.level === highestLevel).length;
  const color = COLOR_MAP[highestLevel];
  const tooltip = ACTION_MAP[highestLevel];

  return (
    <EuiToolTip content={tooltip}>
      <EuiBadge color={color}>{`${single ? '' : numHighest} ${highestLevel}`}</EuiBadge>
    </EuiToolTip>
  );
};
