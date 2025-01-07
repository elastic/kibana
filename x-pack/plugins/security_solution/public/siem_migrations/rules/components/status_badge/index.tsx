/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiLightVars } from '@kbn/ui-theme';

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/css';
import type { RuleMigrationTranslationResult } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { convertTranslationResultIntoText } from '../../utils/helpers';
import * as i18n from './translations';

const statusTextWrapperClassName = css`
  width: 100%;
  display: inline-grid;
`;

const { euiColorVis0, euiColorVis7, euiColorVis9 } = euiLightVars;
const statusToColorMap: Record<RuleMigrationTranslationResult, string> = {
  full: euiColorVis0,
  partial: euiColorVis7,
  untranslatable: euiColorVis9,
};

interface StatusBadgeProps {
  value?: RuleMigrationTranslationResult;
  installedRuleId?: string;
  'data-test-subj'?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(
  ({ value, installedRuleId, 'data-test-subj': dataTestSubj = 'translation-result' }) => {
    const translationResult = installedRuleId ? 'full' : value ?? 'untranslatable';
    const displayValue = installedRuleId
      ? i18n.RULE_STATUS_INSTALLED
      : convertTranslationResultIntoText(translationResult);
    const color = statusToColorMap[translationResult];

    return (
      <EuiToolTip content={displayValue}>
        {installedRuleId ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={'check'} color={statusToColorMap.full} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{displayValue}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiHealth color={color} data-test-subj={dataTestSubj}>
            <div className={statusTextWrapperClassName}>
              <span className="eui-textTruncate">{displayValue}</span>
            </div>
          </EuiHealth>
        )}
      </EuiToolTip>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';
