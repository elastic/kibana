/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import { EuiButton, EuiButtonIcon, EuiPopover, EuiText } from '@elastic/eui';
import { isRuleSnoozed } from './rule_status_dropdown';
import { RuleTableItem } from '../../../../types';
import {
  SnoozePanel,
  futureTimeToInterval,
  usePreviousSnoozeInterval,
  SnoozeUnit,
} from './rule_status_dropdown';

export interface RulesListNotifyBadgeProps {
  rule: RuleTableItem;
  isOpen: boolean;
  previousSnoozeInterval?: string | null;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onClose: () => void;
  onRuleChanged: () => void;
  snoozeRule: (snoozeEndTime: string | -1, interval: string | null) => Promise<void>;
  unsnoozeRule: () => Promise<void>;
}

export const RulesListNotifyBadge: React.FunctionComponent<RulesListNotifyBadgeProps> = (props) => {
  const {
    rule,
    isOpen,
    previousSnoozeInterval: propsPreviousSnoozeInterval,
    onClick,
    onClose,
    onRuleChanged,
    snoozeRule,
    unsnoozeRule,
  } = props;

  const { snoozeEndTime, muteAll } = rule;

  const [previousSnoozeInterval, setPreviousSnoozeInterval] = usePreviousSnoozeInterval(
    propsPreviousSnoozeInterval
  );

  const isSnoozed = useMemo(() => {
    return isRuleSnoozed(rule);
  }, [rule]);

  const isScheduled = useMemo(() => {
    // TODO: Implement scheduled check
    return false;
  }, []);

  const formattedSnooze = useMemo(() => {
    if (muteAll) {
      return 'Indefinite';
    }
    if (!snoozeEndTime) {
      return '';
    }
    return moment(snoozeEndTime).format('MMM D');
  }, [snoozeEndTime, muteAll]);

  const button = useMemo(() => {
    if (isSnoozed || isScheduled) {
      return (
        <EuiButton
          title={formattedSnooze}
          style={{
            maxWidth: '85px',
            height: '32px',
          }}
          contentProps={{
            style: {
              padding: '6px',
            },
          }}
          minWidth={85}
          iconType={isSnoozed ? 'bellSlash' : 'calendar'}
          color={isSnoozed ? 'accent' : 'text'}
          onClick={onClick}
        >
          <EuiText size="xs">{formattedSnooze}</EuiText>
        </EuiButton>
      );
    }
    return (
      <EuiButtonIcon
        className={isOpen ? '' : 'ruleSidebarItem__action'}
        color="danger"
        iconType="bellSlash"
        onClick={onClick}
      />
    );
  }, [isSnoozed, isScheduled, formattedSnooze, isOpen, onClick]);

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
      try {
        if (value === -1) {
          await snoozeRuleAndStoreInterval(-1, null);
        } else if (value !== 0) {
          const newSnoozeEndTime = moment().add(value, unit).toISOString();
          await snoozeRuleAndStoreInterval(newSnoozeEndTime, `${value}${unit}`);
        } else await unsnoozeRule();
        onRuleChanged();
      } finally {
        onClose();
      }
    },
    [onRuleChanged, onClose, snoozeRuleAndStoreInterval, unsnoozeRule]
  );

  return (
    <EuiPopover isOpen={isOpen} closePopover={onClose} button={button}>
      <SnoozePanel
        applySnooze={onChangeSnooze}
        interval={futureTimeToInterval(snoozeEndTime)}
        showCancel={isSnoozed}
        previousSnoozeInterval={previousSnoozeInterval}
      />
    </EuiPopover>
  );
};
