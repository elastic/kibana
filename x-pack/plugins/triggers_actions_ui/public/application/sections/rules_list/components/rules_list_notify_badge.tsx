/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isRuleSnoozed } from './rule_status_dropdown';
import { RuleTableItem } from '../../../../types';
import { RulesListSnoozePanel } from './rules_list_snooze_panel';

export interface RulesListNotifyBadgeProps {
  rule: RuleTableItem;
  isOpen: boolean;
  isLoading: boolean;
  previousSnoozeInterval?: string | null;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onClose: () => void;
  onLoading: (isLoading: boolean) => void;
  onRuleChanged: () => Promise<void>;
  snoozeRule: (snoozeEndTime: string | -1, interval: string | null) => Promise<void>;
  unsnoozeRule: () => Promise<void>;
}

const openSnoozePanelAriaLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.openSnoozePanel',
  { defaultMessage: 'Open snooze panel' }
);

export const RulesListNotifyBadge: React.FunctionComponent<RulesListNotifyBadgeProps> = (props) => {
  const {
    isLoading = false,
    rule,
    isOpen,
    previousSnoozeInterval,
    onClick,
    onClose,
    onLoading,
    onRuleChanged,
    snoozeRule,
    unsnoozeRule,
  } = props;

  const { isSnoozedUntil, muteAll, isEditable } = rule;

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
    return (
      <EuiButtonIcon
        size="s"
        isLoading={isLoading}
        disabled={isLoading || !isEditable}
        display={isLoading ? 'base' : 'empty'}
        data-test-subj="rulesListNotifyBadge-unsnoozed"
        aria-label={openSnoozePanelAriaLabel}
        className={isOpen || isLoading ? '' : 'ruleSidebarItem__action'}
        iconType="bell"
        onClick={onClick}
      />
    );
  }, [isOpen, isLoading, isEditable, onClick]);

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
    if (isOpen) {
      return button;
    }
    return <EuiToolTip content={snoozeTooltipText}>{button}</EuiToolTip>;
  }, [isOpen, button, snoozeTooltipText]);

  return (
    <EuiPopover
      data-test-subj="rulesListNotifyBadge"
      isOpen={isOpen}
      closePopover={onClose}
      button={buttonWithToolTip}
    >
      <EuiPopoverTitle>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="bellSlash" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.snoozeActions',
              { defaultMessage: 'Snooze actions' }
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <RulesListSnoozePanel
        rule={rule}
        onClose={onClose}
        onLoading={onLoading}
        previousSnoozeInterval={previousSnoozeInterval}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { RulesListNotifyBadge as default };
