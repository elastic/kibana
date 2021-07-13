/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy } from 'lodash';
import React, { FunctionComponent } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationInfo } from '../../../../common/types';
import { COLOR_MAP, REVERSE_LEVEL_MAP } from '../constants';

const LocalizedLevels: { [level: string]: string } = {
  warning: i18n.translate('xpack.upgradeAssistant.checkupTab.deprecations.warningLabel', {
    defaultMessage: 'Warning',
  }),
  critical: i18n.translate('xpack.upgradeAssistant.checkupTab.deprecations.criticalLabel', {
    defaultMessage: 'Critical',
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
  deprecationLevels: number[];
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
  deprecationLevels,
  single = false,
}) => {
  if (deprecationLevels.length === 0) {
    return <span />;
  }

  if (single) {
    const highest = Math.max(...deprecationLevels);
    const highestLevel = REVERSE_LEVEL_MAP[highest];

    return <SingleHealth level={highestLevel} label={LocalizedLevels[highestLevel]} />;
  }

  const countByLevel = countBy(deprecationLevels);

  return (
    <React.Fragment>
      {Object.keys(countByLevel)
        .map((k) => parseInt(k, 10))
        .sort()
        .map((level) => [level, REVERSE_LEVEL_MAP[level]])
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
