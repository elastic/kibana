/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import { EuiButton, EuiButtonIcon, EuiPopover, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleSnooze, RuleSnoozeSchedule } from '@kbn/alerting-plugin/common';
import { i18nAbbrMonthDayDate, i18nMonthDayDate } from '../../../lib/i18n_month_day_date';
import { RuleTableItem, SnoozeSchedule } from '../../../../types';
import { SnoozePanel, futureTimeToInterval } from './rule_snooze';

export interface RulesListNotifyBadgeProps {
  rule: RuleTableItem;
  isOpen: boolean;
  previousSnoozeInterval?: string | null;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onClose: () => void;
  onRuleChanged: () => void;
  snoozeRule: (schedule: SnoozeSchedule, muteAll?: boolean) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
}

const openSnoozePanelAriaLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.openSnoozePanel',
  { defaultMessage: 'Open snooze panel' }
);

const isRuleSnoozed = (rule: { isSnoozedUntil?: Date | null; muteAll: boolean }) =>
  Boolean(
    (rule.isSnoozedUntil && new Date(rule.isSnoozedUntil).getTime() > Date.now()) || rule.muteAll
  );

const getNextRuleSnoozeSchedule = (rule: { snoozeSchedule?: RuleSnooze }) => {
  if (!rule.snoozeSchedule || rule.snoozeSchedule.length === 0) return null;
  const nextSchedule = rule.snoozeSchedule.reduce(
    (a: RuleSnoozeSchedule, b: RuleSnoozeSchedule) => {
      if (moment(b.rRule.dtstart).isBefore(moment(a.rRule.dtstart))) return b;
      return a;
    }
  );
  return nextSchedule;
};

export const RulesListNotifyBadge: React.FunctionComponent<RulesListNotifyBadgeProps> = (props) => {
  const { rule, isOpen, onClick, onClose, onRuleChanged, snoozeRule, unsnoozeRule } = props;

  const { isSnoozedUntil, muteAll } = rule;

  const isSnoozedIndefinitely = muteAll;

  const isSnoozed = useMemo(() => {
    return isRuleSnoozed(rule);
  }, [rule]);

  const nextScheduledSnooze = useMemo(() => getNextRuleSnoozeSchedule(rule), [rule]);

  const isScheduled = useMemo(() => {
    return !isSnoozed && Boolean(nextScheduledSnooze);
  }, [nextScheduledSnooze, isSnoozed]);

  const formattedSnoozeText = useMemo(() => {
    if (!isSnoozedUntil) {
      if (nextScheduledSnooze)
        return i18nAbbrMonthDayDate(moment(nextScheduledSnooze.rRule.dtstart));
      return '';
    }
    return i18nAbbrMonthDayDate(moment(isSnoozedUntil));
  }, [isSnoozedUntil, nextScheduledSnooze]);

  const snoozeTooltipText = useMemo(() => {
    if (isSnoozedIndefinitely) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.snoozedIndefinitelyTooltip',
        { defaultMessage: 'Notifications snoozed indefinitely' }
      );
    }
    if (isScheduled) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.snoozeScheduledTooltip',
        {
          defaultMessage: 'Notifications scheduled to snooze starting {schedStart}',
          values: {
            schedStart: i18nMonthDayDate(moment(nextScheduledSnooze!.rRule.dtstart)),
          },
        }
      );
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
  }, [isSnoozedIndefinitely, isScheduled, isSnoozed, isSnoozedUntil, nextScheduledSnooze]);

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

  const onClosePopover = useCallback(() => {
    onClose();
    // Set a timeout on closing the scheduler to avoid flicker
    // setTimeout(onCloseScheduler, 1000);
  }, [onClose]);

  const onApplySnooze = useCallback(
    async (schedule: SnoozeSchedule) => {
      try {
        await snoozeRule(schedule);
        onRuleChanged();
      } finally {
        onClosePopover();
      }
    },
    [snoozeRule, onRuleChanged, onClosePopover]
  );

  const onApplyUnsnooze = useCallback(
    async (scheduleIds?: string[]) => {
      try {
        await unsnoozeRule(scheduleIds);
        onRuleChanged();
      } finally {
        onClosePopover();
      }
    },
    [onRuleChanged, onClosePopover, unsnoozeRule]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={onClosePopover}
      button={buttonWithToolTip}
      anchorPosition="rightCenter"
    >
      <SnoozePanel
        snoozeRule={onApplySnooze}
        unsnoozeRule={onApplyUnsnooze}
        interval={futureTimeToInterval(isSnoozedUntil)}
        showCancel={isSnoozed}
        scheduledSnoozes={rule.snoozeSchedule ?? []}
      />
    </EuiPopover>
  );
};
