/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useUserData } from '../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../common/utils/privileges';
import { useKibana } from '../../../common/lib/kibana';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../api/hooks/use_fetch_rules_snooze_settings';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';

interface RuleSnoozeBadgeProps {
  id: string; // Rule SO's id (not ruleId)
}

export function RuleSnoozeBadge({ id }: RuleSnoozeBadgeProps): JSX.Element {
  const RulesListNotifyBadge = useKibana().services.triggersActionsUi.getRulesListNotifyBadge;
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const {
    state: { rulesSnoozeSettings },
  } = useRulesTableContext();
  const invalidateFetchRuleSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const rule = useMemo(() => {
    const ruleSnoozeSettings = rulesSnoozeSettings.data?.[id];

    return {
      id: ruleSnoozeSettings?.id ?? '',
      muteAll: ruleSnoozeSettings?.mute_all ?? false,
      activeSnoozes: ruleSnoozeSettings?.active_snoozes ?? [],
      isSnoozedUntil: ruleSnoozeSettings?.is_snoozed_until
        ? new Date(ruleSnoozeSettings.is_snoozed_until)
        : undefined,
      snoozeSchedule: ruleSnoozeSettings?.snooze_schedule,
      isEditable: hasCRUDPermissions,
    };
  }, [id, rulesSnoozeSettings, hasCRUDPermissions]);

  if (rulesSnoozeSettings.isError) {
    return (
      <EuiToolTip content={i18n.UNABLE_TO_FETCH_RULE_SNOOZE_SETTINGS}>
        <EuiButtonIcon size="s" iconType="bellSlash" disabled />
      </EuiToolTip>
    );
  }

  return (
    <RulesListNotifyBadge
      rule={rule}
      isLoading={rulesSnoozeSettings.isLoading}
      onRuleChanged={invalidateFetchRuleSnoozeSettings}
    />
  );
}
