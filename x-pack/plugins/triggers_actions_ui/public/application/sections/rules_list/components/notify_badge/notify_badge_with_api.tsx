/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { SnoozeSchedule } from '../../../../../types';
import {
  loadRule,
  snoozeRule as snoozeRuleApi,
  unsnoozeRule as unsnoozeRuleApi,
} from '../../../../lib/rule_api';
import { RulesListNotifyBadge } from './notify_badge';
import { RulesListNotifyBadgePropsWithApi } from './types';

export const RulesListNotifyBadgeWithApi: React.FunctionComponent<
  RulesListNotifyBadgePropsWithApi
> = (props) => {
  const { onRuleChanged, rule, isLoading, showTooltipInline, showOnHover } = props;
  const { http } = useKibana().services;
  const [currentlyOpenNotify, setCurrentlyOpenNotify] = useState<string>();
  const [loadingSnoozeAction, setLoadingSnoozeAction] = useState<boolean>(false);
  const [ruleSnoozeInfo, setRuleSnoozeInfo] =
    useState<RulesListNotifyBadgePropsWithApi['rule']>(rule);

  const onSnoozeRule = useCallback(
    (snoozeSchedule: SnoozeSchedule) => {
      return snoozeRuleApi({ http, id: ruleSnoozeInfo.id, snoozeSchedule });
    },
    [http, ruleSnoozeInfo.id]
  );

  const onUnsnoozeRule = useCallback(
    (scheduleIds?: string[]) => {
      return unsnoozeRuleApi({ http, id: ruleSnoozeInfo.id, scheduleIds });
    },
    [http, ruleSnoozeInfo.id]
  );

  const onRuleChangedCallback = useCallback(async () => {
    const updatedRule = await loadRule({
      http,
      ruleId: ruleSnoozeInfo.id,
    });
    setLoadingSnoozeAction(false);
    setRuleSnoozeInfo((prevRule) => ({
      ...prevRule,
      activeSnoozes: updatedRule.activeSnoozes,
      isSnoozedUntil: updatedRule.isSnoozedUntil,
      muteAll: updatedRule.muteAll,
      snoozeSchedule: updatedRule.snoozeSchedule,
    }));
    onRuleChanged();
  }, [http, ruleSnoozeInfo.id, onRuleChanged]);

  const openSnooze = useCallback(() => {
    setCurrentlyOpenNotify(props.rule.id);
  }, [props.rule.id]);

  const closeSnooze = useCallback(() => {
    setCurrentlyOpenNotify('');
  }, []);

  const onLoading = useCallback((value: boolean) => {
    if (value) {
      setLoadingSnoozeAction(value);
    }
  }, []);

  return (
    <RulesListNotifyBadge
      rule={ruleSnoozeInfo}
      isOpen={currentlyOpenNotify === ruleSnoozeInfo.id}
      isLoading={isLoading || loadingSnoozeAction}
      onClick={openSnooze}
      onClose={closeSnooze}
      onLoading={onLoading}
      onRuleChanged={onRuleChangedCallback}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      showTooltipInline={showTooltipInline}
      showOnHover={showOnHover}
    />
  );
};
