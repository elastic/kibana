/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { RuleSnoozeSettings } from '../logic';
import { useKibana } from '../../../common/lib/kibana';

interface RuleSnoozeBadgeProps {
  snoozeSettings?: RuleSnoozeSettings;
  hasCRUDPermissions: boolean;
  onChange: () => void;
}

export function RuleSnoozeBadge({
  snoozeSettings,
  hasCRUDPermissions,
  onChange,
}: RuleSnoozeBadgeProps): JSX.Element {
  const RulesListNotifyBadge = useKibana().services.triggersActionsUi.getRulesListNotifyBadge;
  const rule = useMemo(
    () => ({
      id: snoozeSettings?.id ?? '',
      muteAll: snoozeSettings?.mute_all ?? false,
      activeSnoozes: snoozeSettings?.active_snoozes ?? [],
      isSnoozedUntil: snoozeSettings?.is_snoozed_until
        ? new Date(snoozeSettings.is_snoozed_until)
        : undefined,
      snoozeSchedule: snoozeSettings?.snooze_schedule,
      isEditable: hasCRUDPermissions,
    }),
    [snoozeSettings, hasCRUDPermissions]
  );

  return <RulesListNotifyBadge rule={rule} isLoading={!snoozeSettings} onRuleChanged={onChange} />;
}
