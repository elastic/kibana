/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { EuiButton, EuiButtonIcon, EuiPopover, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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

const openSnoozePanelAriaLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.openSnoozePanel',
  { defaultMessage: 'Open snooze panel' }
);

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

  const { isSnoozedUntil, muteAll } = rule;

  const [previousSnoozeInterval, setPreviousSnoozeInterval] = usePreviousSnoozeInterval(
    propsPreviousSnoozeInterval
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isSnoozedIndefinitely = muteAll;

  const isSnoozed = useMemo(() => {
    return isRuleSnoozed(rule);
  }, [rule]);

  const isScheduled = useMemo(() => {
    // TODO: Implement scheduled check
    return false;
  }, []);

  const formattedSnoozeText = useMemo(() => {
    if (!isSnoozedUntil) {
      return '';
    }
    return moment(isSnoozedUntil).format('MMM D');
  }, [isSnoozedUntil]);

  const snoozeTooltipText = useMemo(() => {
    if (isSnoozedIndefinitely) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.snoozedIndefinitelyTooltip',
        { defaultMessage: 'Notifications snoozed indefinitely' }
      );
    }
    if (isScheduled) {
      return '';
      // TODO: Implement scheduled tooltip
    }
    if (isSnoozed) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.snoozedTooltip',
        {
          defaultMessage: 'Notifications snoozed for {snoozeTime}',
          values: {
            snoozeTime: moment(isSnoozedUntil).fromNow(true),
          },
        }
      );
    }
    return '';
  }, [isSnoozedIndefinitely, isScheduled, isSnoozed, isSnoozedUntil]);

  const snoozedButton = useMemo(() => {
    return (
      <EuiButton
        data-test-subj="rulesListNotifyBadge"
        minWidth={85}
        iconType="bellSlash"
        color="accent"
        onClick={onClick}
      >
        <EuiText size="xs">{formattedSnoozeText}</EuiText>
      </EuiButton>
    );
  }, [formattedSnoozeText, onClick]);

  const scheduledSnoozeButton = useMemo(() => {
    // TODO: Implement scheduled snooze button
    return (
      <EuiButton
        data-test-subj="rulesListNotifyBadge"
        minWidth={85}
        iconType="calendar"
        color="text"
        onClick={onClick}
      >
        <EuiText size="xs">{formattedSnoozeText}</EuiText>
      </EuiButton>
    );
  }, [formattedSnoozeText, onClick]);

  const unsnoozedButton = useMemo(() => {
    return (
      <EuiButtonIcon
        size="m"
        data-test-subj="rulesListNotifyBadge"
        aria-label={openSnoozePanelAriaLabel}
        className={isOpen ? '' : 'ruleSidebarItem__action'}
        color="accent"
        iconType="bellSlash"
        onClick={onClick}
      />
    );
  }, [isOpen, onClick]);

  const indefiniteSnoozeButton = useMemo(() => {
    return (
      <EuiButtonIcon
        display="base"
        size="m"
        data-test-subj="rulesListNotifyBadge"
        iconType="bellSlash"
        color="accent"
        onClick={onClick}
      />
    );
  }, [onClick]);

  const button = useMemo(() => {
    if (isScheduled) {
      return scheduledSnoozeButton;
    }
    if (isSnoozedIndefinitely) {
      return indefiniteSnoozeButton;
    }
    if (isSnoozed) {
      return snoozedButton;
    }
    return unsnoozedButton;
  }, [
    isSnoozed,
    isScheduled,
    isSnoozedIndefinitely,
    scheduledSnoozeButton,
    snoozedButton,
    indefiniteSnoozeButton,
    unsnoozedButton,
  ]);

  const buttonWithToolTip = useMemo(() => {
    if (isOpen) {
      return button;
    }
    return <EuiToolTip content={snoozeTooltipText}>{button}</EuiToolTip>;
  }, [isOpen, button, snoozeTooltipText]);

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
        } else await unsnoozeRule();
        onRuleChanged();
      } finally {
        onClose();
        setIsLoading(false);
      }
    },
    [onRuleChanged, onClose, snoozeRuleAndStoreInterval, unsnoozeRule, setIsLoading]
  );

  return (
    <EuiPopover isOpen={isOpen} closePopover={onClose} button={buttonWithToolTip}>
      <SnoozePanel
        isLoading={isLoading}
        applySnooze={onChangeSnooze}
        interval={futureTimeToInterval(isSnoozedUntil)}
        showCancel={isSnoozed}
        previousSnoozeInterval={previousSnoozeInterval}
      />
    </EuiPopover>
  );
};
