/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchRulesSnoozeSettings } from '../../../../../rule_management/api/hooks/use_fetch_rules_snooze_settings';
import { RuleSnoozeBadge } from '../../../../../components/rule_snooze_badge';
import * as i18n from './translations';

interface RuleDetailsSnoozeBadge {
  /**
   * Rule's SO id (not ruleId)
   */
  id: string;
}

export function RuleDetailsSnoozeSettings({ id }: RuleDetailsSnoozeBadge): JSX.Element {
  const { data: rulesSnoozeSettings, isFetching, isError } = useFetchRulesSnoozeSettings([id]);
  const snoozeSettings = rulesSnoozeSettings?.[0];

  return (
    <RuleSnoozeBadge
      snoozeSettings={snoozeSettings}
      error={
        isError || (!snoozeSettings && !isFetching)
          ? i18n.UNABLE_TO_FETCH_RULE_SNOOZE_SETTINGS
          : undefined
      }
      showTooltipInline={true}
    />
  );
}
