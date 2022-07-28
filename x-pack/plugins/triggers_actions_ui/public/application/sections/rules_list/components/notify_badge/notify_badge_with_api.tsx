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
  snoozeRule as snoozeRuleApi,
  unsnoozeRule as unsnoozeRuleApi,
} from '../../../../lib/rule_api';
import { RulesListNotifyBadge } from './notify_badge';
import { RulesListNotifyBadgePropsWithApi } from './types';

export const RulesListNotifyBadgeWithApi: React.FunctionComponent<
  RulesListNotifyBadgePropsWithApi
> = (props) => {
  const { http } = useKibana().services;
  const [currentlyOpenNotify, setCurrentlyOpenNotify] = useState<string>();
  const [loadingSnoozeAction, setLoadingSnoozeAction] = useState<boolean>(false);
  const onSnoozeRule = useCallback(
    (snoozeSchedule: SnoozeSchedule) => {
      return snoozeRuleApi({ http, id: props.rule.id, snoozeSchedule });
    },
    [http, props.rule.id]
  );

  const onUnsnoozeRule = useCallback(
    (scheduleIds?: string[]) => {
      return unsnoozeRuleApi({ http, id: props.rule.id, scheduleIds });
    },
    [http, props.rule.id]
  );

  const openSnooze = useCallback(() => {
    setCurrentlyOpenNotify(props.rule.id);
  }, [props.rule.id]);

  const closeSnooze = useCallback(() => {
    setCurrentlyOpenNotify('');
  }, []);

  const onLoading = useCallback((value: boolean) => {
    setLoadingSnoozeAction(value);
  }, []);

  return (
    <RulesListNotifyBadge
      rule={props.rule}
      isOpen={currentlyOpenNotify === props.rule.id}
      isLoading={props.isLoading || loadingSnoozeAction}
      onClick={openSnooze}
      onClose={closeSnooze}
      onLoading={onLoading}
      onRuleChanged={props.onRuleChanged}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      showTooltipInline={false}
      showOnHover={true}
    />
  );
};
