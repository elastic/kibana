/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import moment from 'moment';
import { RuleTableItem } from '../../../../types';
import {
  SnoozePanel,
  futureTimeToInterval,
  usePreviousSnoozeInterval,
  SnoozeUnit,
  isRuleSnoozed,
} from './rule_status_dropdown';

export interface RulesListSnoozePanelProps {
  rule: RuleTableItem;
  previousSnoozeInterval?: string | null;
  onRuleChanged: () => void;
  snoozeRule: (snoozeEndTime: string | -1, interval: string | null) => Promise<void>;
  unsnoozeRule: () => Promise<void>;
}

export const RulesListSnoozePanel = (props: RulesListSnoozePanelProps) => {
  const {
    rule,
    previousSnoozeInterval: propsPreviousSnoozeInterval,
    onRuleChanged,
    snoozeRule,
    unsnoozeRule,
  } = props;

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { isSnoozedUntil } = rule;

  const [previousSnoozeInterval, setPreviousSnoozeInterval] = usePreviousSnoozeInterval(
    propsPreviousSnoozeInterval
  );

  const isSnoozed = useMemo(() => {
    return isRuleSnoozed(rule);
  }, [rule]);

  const snoozeRuleAndStoreInterval = useCallback(
    (newSnoozeEndTime: string | -1, interval: string | null) => {
      if (interval) {
        setPreviousSnoozeInterval(interval);
      }
      return snoozeRule(newSnoozeEndTime, interval);
    },
    [setPreviousSnoozeInterval, snoozeRule]
  );

  const onChangeSnooze = useCallback(
    async (value: number, unit?: SnoozeUnit) => {
      setIsLoading(true);
      try {
        if (value === -1) {
          await snoozeRuleAndStoreInterval(-1, null);
        } else if (value !== 0) {
          const newSnoozeEndTime = moment().add(value, unit).toISOString();
          await snoozeRuleAndStoreInterval(newSnoozeEndTime, `${value}${unit}`);
        } else {
          await unsnoozeRule();
        }
      } finally {
        setIsLoading(false);
        onRuleChanged();
      }
    },
    [onRuleChanged, snoozeRuleAndStoreInterval, unsnoozeRule, setIsLoading]
  );

  return (
    <SnoozePanel
      isLoading={isLoading}
      applySnooze={onChangeSnooze}
      interval={futureTimeToInterval(isSnoozedUntil)}
      showCancel={isSnoozed}
      previousSnoozeInterval={previousSnoozeInterval}
    />
  );
};
