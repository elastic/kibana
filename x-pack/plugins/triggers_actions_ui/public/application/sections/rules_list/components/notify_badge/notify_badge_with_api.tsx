/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { SnoozeSchedule } from '../../../../../types';
import { unsnoozeRule as unsnoozeRuleApi } from '../../../../lib/rule_api/unsnooze';
import { snoozeRule as snoozeRuleApi } from '../../../../lib/rule_api/snooze';
import { RulesListNotifyBadge } from './notify_badge';
import { RulesListNotifyBadgePropsWithApi } from './types';

export const RulesListNotifyBadgeWithApi: React.FunctionComponent<
  RulesListNotifyBadgePropsWithApi
> = ({ snoozeSettings, showTooltipInline, showOnHover, onRuleChanged }) => {
  const { http } = useKibana().services;

  const onSnoozeRule = useCallback(
    (snoozeSchedule: SnoozeSchedule) =>
      snoozeSettings?.id
        ? snoozeRuleApi({ http, id: snoozeSettings.id, snoozeSchedule })
        : Promise.resolve(),
    [http, snoozeSettings?.id]
  );

  const onUnsnoozeRule = useCallback(
    (scheduleIds?: string[]) =>
      snoozeSettings?.id
        ? unsnoozeRuleApi({ http, id: snoozeSettings.id, scheduleIds })
        : Promise.resolve(),
    [http, snoozeSettings?.id]
  );

  return (
    <RulesListNotifyBadge
      snoozeSettings={snoozeSettings}
      onRuleChanged={onRuleChanged}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      showTooltipInline={showTooltipInline}
      showOnHover={showOnHover}
    />
  );
};
