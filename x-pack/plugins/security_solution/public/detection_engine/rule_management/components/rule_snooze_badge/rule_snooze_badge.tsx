/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { RuleObjectId } from '../../../../../common/detection_engine/rule_schema';
import { useUserData } from '../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { useKibana } from '../../../../common/lib/kibana';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../../api/hooks/use_fetch_rules_snooze_settings';
import { useRuleSnoozeSettings } from './use_rule_snooze_settings';

interface RuleSnoozeBadgeProps {
  /**
   * Rule's SO id (not ruleId)
   */
  ruleId: RuleObjectId;
  showTooltipInline?: boolean;
}

export function RuleSnoozeBadge({
  ruleId,
  showTooltipInline = false,
}: RuleSnoozeBadgeProps): JSX.Element {
  const RulesListNotifyBadge = useKibana().services.triggersActionsUi.getRulesListNotifyBadge;
  const { snoozeSettings, error } = useRuleSnoozeSettings(ruleId);
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const invalidateFetchRuleSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const isLoading = !snoozeSettings;
  const rule = useMemo(
    () => ({
      id: snoozeSettings?.id ?? '',
      muteAll: snoozeSettings?.muteAll ?? false,
      activeSnoozes: snoozeSettings?.activeSnoozes ?? [],
      isSnoozedUntil: snoozeSettings?.isSnoozedUntil
        ? new Date(snoozeSettings.isSnoozedUntil)
        : undefined,
      snoozeSchedule: snoozeSettings?.snoozeSchedule,
      isEditable: hasCRUDPermissions,
    }),
    [snoozeSettings, hasCRUDPermissions]
  );

  if (error) {
    return (
      <EuiToolTip content={error}>
        <EuiButtonIcon size="s" iconType="bellSlash" disabled />
      </EuiToolTip>
    );
  }

  return (
    <RulesListNotifyBadge
      rule={rule}
      isLoading={isLoading}
      showTooltipInline={showTooltipInline}
      onRuleChanged={invalidateFetchRuleSnoozeSettings}
    />
  );
}
