/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiLightVars } from '@kbn/ui-theme';

import type { RuleMigrationTranslationResult } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { HealthTruncateText } from '../../../../common/components/health_truncate_text';
import { convertTranslationResultIntoText } from '../../utils/helpers';

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
    const displayValue = convertTranslationResultIntoText(translationResult);
    const color = statusToColorMap[translationResult];

    return (
      <HealthTruncateText
        healthColor={color}
        tooltipContent={displayValue}
        dataTestSubj={dataTestSubj}
      >
        {displayValue}
      </HealthTruncateText>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';
