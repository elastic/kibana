/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { countBy } from 'lodash';
import React, { StatelessComponent } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';

import { DeprecationInfo, MIGRATION_DEPRECATION_LEVEL } from 'src/core_plugins/elasticsearch';
import { ACTION_MAP, COLOR_MAP, LEVEL_MAP, REVERSE_LEVEL_MAP } from './constants';

interface DeprecationHealthProps {
  deprecations: DeprecationInfo[];
  single?: boolean;
}

const SingleHealth: StatelessComponent<{ level: MIGRATION_DEPRECATION_LEVEL; label: string }> = ({
  level,
  label,
}) => (
  <React.Fragment>
    <EuiToolTip content={ACTION_MAP[level]}>
      <EuiBadge color={COLOR_MAP[level]}>{label}</EuiBadge>
    </EuiToolTip>
    &emsp;
  </React.Fragment>
);

/**
 * Displays a summary health for a list of deprecations that shows the number and level of highest severity
 * deprecations in the list.
 * TODO: Allow showing all severity levels
 */
export const DeprecationHealth: StatelessComponent<DeprecationHealthProps> = ({
  deprecations,
  single = false,
}) => {
  if (deprecations.length === 0) {
    return <span />;
  }

  const levels = deprecations.map(d => LEVEL_MAP[d.level]);

  if (single) {
    const highest = Math.max(...levels);
    const highestLevel = REVERSE_LEVEL_MAP[highest];

    return <SingleHealth level={highestLevel} label={highestLevel} />;
  }

  const countByLevel = countBy(levels);

  return (
    <React.Fragment>
      {Object.keys(countByLevel)
        .map(k => parseInt(k, 10))
        .sort()
        .map(level => [level, REVERSE_LEVEL_MAP[level]])
        .map(([numLevel, stringLevel]) => (
          <SingleHealth
            level={stringLevel as MIGRATION_DEPRECATION_LEVEL}
            label={`${countByLevel[numLevel]} ${stringLevel}`}
          />
        ))}
    </React.Fragment>
  );
};
