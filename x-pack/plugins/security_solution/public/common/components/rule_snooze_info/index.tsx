/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import { useKibana } from '../../lib/kibana';

interface RuleSnoozeInfoProps {
  rule: Rule;
  hasCRUDPermissions: boolean;
  isLoading?: boolean;
}

export function RuleSnoozeInfo({
  rule,
  hasCRUDPermissions,
  isLoading,
}: RuleSnoozeInfoProps): JSX.Element {
  const RulesListNotifyBadge = useKibana().services.triggersActionsUi.getRulesListNotifyBadge;
  const handleChange = useCallback(() => {}, []);

  return (
    <RulesListNotifyBadge
      rule={{
        id: rule.id,
        muteAll: rule.snooze_info?.mute_all ?? false,
        activeSnoozes: rule.snooze_info?.active_snoozes,
        isSnoozedUntil: rule.snooze_info?.is_snoozed_until
          ? new Date(rule.snooze_info?.is_snoozed_until as Date)
          : undefined,
        snoozeSchedule: rule.snooze_info?.snooze_schedule ?? [],
        isEditable: hasCRUDPermissions,
      }}
      isLoading={isLoading ?? false}
      onRuleChanged={handleChange}
    />
  );
}
