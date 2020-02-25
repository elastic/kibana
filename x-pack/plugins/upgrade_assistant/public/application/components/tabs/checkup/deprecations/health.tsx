/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { countBy } from 'lodash';
import React, { FunctionComponent } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { COLOR_MAP, LEVEL_MAP, REVERSE_LEVEL_MAP } from '../constants';

const LocalizedLevels: { [level: string]: string } = {
  warning: i18n.translate('xpack.upgradeAssistant.checkupTab.deprecations.warningLabel', {
    defaultMessage: 'warning',
  }),
  critical: i18n.translate('xpack.upgradeAssistant.checkupTab.deprecations.criticalLabel', {
    defaultMessage: 'critical',
  }),
};

export const LocalizedActions: { [level: string]: string } = {
  warning: i18n.translate('xpack.upgradeAssistant.checkupTab.deprecations.warningActionTooltip', {
    defaultMessage: 'Resolving this issue before upgrading is advised, but not required.',
  }),
  critical: i18n.translate('xpack.upgradeAssistant.checkupTab.deprecations.criticalActionTooltip', {
    defaultMessage: 'Resolve this issue before upgrading.',
  }),
};

interface DeprecationHealthProps {
  deprecations: DeprecationInfo[];
  single?: boolean;
}

const SingleHealth: FunctionComponent<{ level: DeprecationInfo['level']; label: string }> = ({
  level,
  label,
}) => (
  <React.Fragment>
    <EuiToolTip content={LocalizedActions[level]}>
      <EuiBadge color={COLOR_MAP[level]}>{label}</EuiBadge>
    </EuiToolTip>
    &emsp;
  </React.Fragment>
);

/**
 * Displays a summary health for a list of deprecations that shows the number and level of severity
 * deprecations in the list.
 */
export const DeprecationHealth: FunctionComponent<DeprecationHealthProps> = ({
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

    return <SingleHealth level={highestLevel} label={LocalizedLevels[highestLevel]} />;
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
            key={stringLevel}
            level={stringLevel as DeprecationInfo['level']}
            label={`${countByLevel[numLevel]} ${LocalizedLevels[stringLevel]}`}
          />
        ))}
    </React.Fragment>
  );
};
