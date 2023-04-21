/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { SnoozeSchedule } from '../../../../../types';
import { unsnoozeRule as unsnoozeRuleApi } from '../../../../lib/rule_api/unsnooze';
import { snoozeRule as snoozeRuleApi } from '../../../../lib/rule_api/snooze';
import { RulesListNotifyBadge } from './notify_badge';
import { RulesListNotifyBadgePropsWithApi } from './types';

export const RulesListNotifyBadgeWithApi: React.FunctionComponent<
  RulesListNotifyBadgePropsWithApi
> = (props) => {
  const { onRuleChanged, rule, isLoading, showTooltipInline, showOnHover } = props;
  const { http } = useKibana().services;
  const [currentlyOpenNotify, setCurrentlyOpenNotify] = useState<string>();
  const [loadingSnoozeAction, setLoadingSnoozeAction] = useState<boolean>(false);

  const onSnoozeRule = useCallback(
    (snoozeSchedule: SnoozeSchedule) =>
      rule?.id ? snoozeRuleApi({ http, id: rule.id, snoozeSchedule }) : Promise.resolve(),
    [http, rule?.id]
  );

  const onUnsnoozeRule = useCallback(
    (scheduleIds?: string[]) =>
      rule?.id ? unsnoozeRuleApi({ http, id: rule.id, scheduleIds }) : Promise.resolve(),
    [http, rule?.id]
  );

  const openSnooze = useCallback(() => {
    setCurrentlyOpenNotify(rule?.id);
  }, [rule?.id]);

  const closeSnooze = useCallback(() => {
    setCurrentlyOpenNotify('');
  }, []);

  const onLoading = useCallback((value: boolean) => setLoadingSnoozeAction(value), []);

  return (
    <RulesListNotifyBadge
      rule={rule}
      isOpen={currentlyOpenNotify === rule?.id}
      isLoading={isLoading || loadingSnoozeAction}
      onClick={openSnooze}
      onClose={closeSnooze}
      onLoading={onLoading}
      onRuleChanged={onRuleChanged}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      showTooltipInline={showTooltipInline}
      showOnHover={showOnHover}
    />
  );
};
