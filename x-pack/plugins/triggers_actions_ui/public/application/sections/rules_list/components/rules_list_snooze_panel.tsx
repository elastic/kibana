/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { RuleTableItem } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import {
  SnoozePanel,
  futureTimeToInterval,
  usePreviousSnoozeInterval,
  SnoozeUnit,
  isRuleSnoozed,
} from './rule_status_dropdown';

export const SNOOZE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.snoozeSuccess',
  {
    defaultMessage: 'Rule successfully snoozed',
  }
);

export const UNSNOOZE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.unsnoozeSuccess',
  {
    defaultMessage: 'Rule successfully unsnoozed',
  }
);

export const SNOOZE_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListSnoozePanel.snoozeFailed',
  {
    defaultMessage: 'Unabled to change rule snooze settings',
  }
);

const EMPTY_HANDLER = () => {};

export interface RulesListSnoozePanelProps {
  rule: RuleTableItem;
  previousSnoozeInterval?: string | null;
  onLoading?: (isLoading: boolean) => void;
  onRuleChanged: () => Promise<void>;
  onClose: () => void;
  snoozeRule: (snoozeEndTime: string | -1, interval: string | null) => Promise<void>;
  unsnoozeRule: () => Promise<void>;
}

export const RulesListSnoozePanel = (props: RulesListSnoozePanelProps) => {
  const {
    rule,
    previousSnoozeInterval: propsPreviousSnoozeInterval,
    onRuleChanged,
    onClose,
    snoozeRule,
    unsnoozeRule,
    onLoading = EMPTY_HANDLER,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

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
      onLoading(true);
      onClose();
      try {
        if (value === -1) {
          await snoozeRuleAndStoreInterval(-1, null);
          toasts.addSuccess(SNOOZE_SUCCESS_MESSAGE);
        } else if (value !== 0) {
          const newSnoozeEndTime = moment().add(value, unit).toISOString();
          await snoozeRuleAndStoreInterval(newSnoozeEndTime, `${value}${unit}`);
          toasts.addSuccess(SNOOZE_SUCCESS_MESSAGE);
        } else {
          await unsnoozeRule();
          toasts.addSuccess(UNSNOOZE_SUCCESS_MESSAGE);
        }
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        await onRuleChanged();
        onLoading(false);
      }
    },
    [toasts, onRuleChanged, snoozeRuleAndStoreInterval, unsnoozeRule, onLoading, onClose]
  );

  return (
    <SnoozePanel
      applySnooze={onChangeSnooze}
      interval={futureTimeToInterval(isSnoozedUntil)}
      showCancel={isSnoozed}
      previousSnoozeInterval={previousSnoozeInterval}
    />
  );
};
