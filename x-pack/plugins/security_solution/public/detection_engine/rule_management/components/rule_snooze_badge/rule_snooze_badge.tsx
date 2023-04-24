/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useUserData } from '../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { useKibana } from '../../../../common/lib/kibana';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../../api/hooks/use_fetch_rules_snooze_settings';
import { useRuleSnoozeSettings } from './use_rule_snooze_settings';

interface RuleSnoozeBadgeProps {
  /**
   * Rule's SO id (not ruleId)
   */
  id: string;
  showTooltipInline?: boolean;
}

export function RuleSnoozeBadge({
  id,
  showTooltipInline = false,
}: RuleSnoozeBadgeProps): JSX.Element {
  const RulesListNotifyBadge = useKibana().services.triggersActionsUi.getRulesListNotifyBadge;
  const { snoozeSettings, error } = useRuleSnoozeSettings(id);
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const invalidateFetchRuleSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const isLoading = !snoozeSettings;
  const rule = useMemo(() => {
    return {
      id: snoozeSettings?.id ?? '',
      muteAll: snoozeSettings?.mute_all ?? false,
      activeSnoozes: snoozeSettings?.active_snoozes ?? [],
      isSnoozedUntil: snoozeSettings?.is_snoozed_until
        ? new Date(snoozeSettings.is_snoozed_until)
        : undefined,
      snoozeSchedule: snoozeSettings?.snooze_schedule,
      isEditable: hasCRUDPermissions,
    };
  }, [snoozeSettings, hasCRUDPermissions]);

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
