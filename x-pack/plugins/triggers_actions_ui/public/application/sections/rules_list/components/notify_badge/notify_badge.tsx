/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../common/lib/kibana';
import { SnoozeSchedule } from '../../../../../types';
import { i18nAbbrMonthDayDate, i18nMonthDayDate } from '../../../../lib/i18n_month_day_date';
import { SnoozePanel, futureTimeToInterval } from '../rule_snooze';
import { getNextRuleSnoozeSchedule, isRuleSnoozed } from './helpers';
import {
  openSnoozePanelAriaLabel,
  SNOOZE_FAILED_MESSAGE,
  SNOOZE_SUCCESS_MESSAGE,
  UNSNOOZE_SUCCESS_MESSAGE,
} from './translations';
import { RulesListNotifyBadgeProps } from './types';

export const RulesListNotifyBadge: React.FunctionComponent<RulesListNotifyBadgeProps> = (props) => {
  const {
    isLoading = false,
    rule,
    isOpen,
    onClick,
    onClose,
    onLoading,
    onRuleChanged,
    snoozeRule,
    unsnoozeRule,
    showOnHover = false,
    showTooltipInline = false,
  } = props;

  const { isSnoozedUntil, muteAll, isEditable } = rule;

  const isSnoozedIndefinitely = muteAll;

  const {
    notifications: { toasts },
  } = useKibana().services;

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
          defaultMessage: 'Notifications snoozing for {snoozeTime}',
          values: {
            snoozeTime: moment(isSnoozedUntil).fromNow(true),
          },
        }
      );
    }
    if (showTooltipInline) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.noSnoozeAppliedTooltip',
        {
          defaultMessage: 'Notify when alerts generated',
        }
      );
    }
    return '';
  }, [
    isSnoozedIndefinitely,
    isScheduled,
    isSnoozed,
    isSnoozedUntil,
    nextScheduledSnooze,
    showTooltipInline,
  ]);

  const snoozedButton = useMemo(() => {
    return (
      <EuiButton
        size="s"
        isLoading={isLoading}
        disabled={isLoading || !isEditable}
        data-test-subj="rulesListNotifyBadge-snoozed"
        aria-label={openSnoozePanelAriaLabel}
        minWidth={85}
        iconType="bellSlash"
        color="accent"
        onClick={onClick}
      >
        <EuiText size="xs">{formattedSnoozeText}</EuiText>
      </EuiButton>
    );
  }, [formattedSnoozeText, isLoading, isEditable, onClick]);

  const scheduledSnoozeButton = useMemo(() => {
    // TODO: Implement scheduled snooze button
    return (
      <EuiButton
        size="s"
        isLoading={isLoading}
        disabled={isLoading || !isEditable}
        data-test-subj="rulesListNotifyBadge-scheduled"
        minWidth={85}
        iconType="calendar"
        color="text"
        aria-label={openSnoozePanelAriaLabel}
        onClick={onClick}
      >
        <EuiText size="xs">{formattedSnoozeText}</EuiText>
      </EuiButton>
    );
  }, [formattedSnoozeText, isLoading, isEditable, onClick]);

  const unsnoozedButton = useMemo(() => {
    // This show on hover is needed because we need style sheets to achieve the
    // show on hover effect in the rules list. However we don't want this to be
    // a default behaviour of this component.
    const showOnHoverClass = showOnHover ? 'ruleSidebarItem__action' : '';
    return (
      <EuiButtonIcon
        size="s"
        isLoading={isLoading}
        disabled={isLoading || !isEditable}
        display={isLoading ? 'base' : 'empty'}
        data-test-subj="rulesListNotifyBadge-unsnoozed"
        aria-label={openSnoozePanelAriaLabel}
        className={isOpen || isLoading ? '' : showOnHoverClass}
        iconType="bell"
        onClick={onClick}
      />
    );
  }, [isOpen, isLoading, isEditable, showOnHover, onClick]);

  const indefiniteSnoozeButton = useMemo(() => {
    return (
      <EuiButtonIcon
        size="s"
        isLoading={isLoading}
        disabled={isLoading || !isEditable}
        display="base"
        data-test-subj="rulesListNotifyBadge-snoozedIndefinitely"
        aria-label={openSnoozePanelAriaLabel}
        iconType="bellSlash"
        color="accent"
        onClick={onClick}
      />
    );
  }, [isLoading, isEditable, onClick]);

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
    if (isOpen || showTooltipInline) {
      return button;
    }
    return <EuiToolTip content={snoozeTooltipText}>{button}</EuiToolTip>;
  }, [isOpen, button, snoozeTooltipText, showTooltipInline]);

  const onClosePopover = useCallback(() => {
    onClose();
    // Set a timeout on closing the scheduler to avoid flicker
    // setTimeout(onCloseScheduler, 1000);
  }, [onClose]);

  const onApplySnooze = useCallback(
    async (schedule: SnoozeSchedule) => {
      try {
        onLoading(true);
        onClosePopover();
        await snoozeRule(schedule);
        onRuleChanged();
        toasts.addSuccess(SNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        onLoading(false);
      }
    },
    [onLoading, snoozeRule, onRuleChanged, toasts, onClosePopover]
  );

  const onApplyUnsnooze = useCallback(
    async (scheduleIds?: string[]) => {
      try {
        onLoading(true);
        onClosePopover();
        await unsnoozeRule(scheduleIds);
        onRuleChanged();
        toasts.addSuccess(UNSNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        onLoading(false);
      }
    },
    [onLoading, unsnoozeRule, onRuleChanged, toasts, onClosePopover]
  );

  const popover = (
    <EuiPopover
      data-test-subj="rulesListNotifyBadge"
      isOpen={isOpen}
      closePopover={onClosePopover}
      button={buttonWithToolTip}
      anchorPosition="rightCenter"
      panelStyle={{ maxHeight: '100vh', overflowY: 'auto' }}
    >
      <SnoozePanel
        snoozeRule={onApplySnooze}
        unsnoozeRule={onApplyUnsnooze}
        interval={futureTimeToInterval(isSnoozedUntil)}
        showCancel={isSnoozed}
        scheduledSnoozes={rule.snoozeSchedule ?? []}
        activeSnoozes={rule.activeSnoozes ?? []}
        inPopover
      />
    </EuiPopover>
  );
  if (showTooltipInline) {
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>{popover}</EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="xs">
            {snoozeTooltipText}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  return popover;
};
