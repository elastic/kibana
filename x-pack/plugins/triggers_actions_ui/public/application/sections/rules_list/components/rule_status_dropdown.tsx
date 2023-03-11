/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RuleSnooze } from '@kbn/alerting-plugin/common';
import {
  EuiLoadingSpinner,
  EuiPopover,
  EuiContextMenu,
  EuiBadge,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { SnoozePanel } from './rule_snooze';
import { isRuleSnoozed } from '../../../lib';
import { Rule, SnoozeSchedule } from '../../../../types';

export type SnoozeUnit = 'm' | 'h' | 'd' | 'w' | 'M';
const SNOOZE_END_TIME_FORMAT = 'LL @ LT';

type DropdownRuleRecord = Pick<
  Rule,
  'enabled' | 'muteAll' | 'isSnoozedUntil' | 'snoozeSchedule' | 'activeSnoozes'
>;

export interface ComponentOpts {
  rule: DropdownRuleRecord;
  onRuleChanged: () => void;
  enableRule: () => Promise<void>;
  disableRule: () => Promise<void>;
  snoozeRule: (snoozeSchedule: SnoozeSchedule) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  isEditable: boolean;
  direction?: 'column' | 'row';
  hideSnoozeOption?: boolean;
}

export const RuleStatusDropdown: React.FunctionComponent<ComponentOpts> = ({
  rule,
  onRuleChanged,
  disableRule,
  enableRule,
  snoozeRule,
  unsnoozeRule,
  isEditable,
  hideSnoozeOption = false,
  direction = 'column',
}: ComponentOpts) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(rule.enabled);
  const [isSnoozed, setIsSnoozed] = useState<boolean>(!hideSnoozeOption && isRuleSnoozed(rule));

  useEffect(() => {
    setIsEnabled(rule.enabled);
  }, [rule.enabled]);
  useEffect(() => {
    if (!hideSnoozeOption) setIsSnoozed(isRuleSnoozed(rule));
  }, [rule, hideSnoozeOption]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onClickBadge = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), [setIsPopoverOpen]);
  const onClosePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  const onChangeEnabledStatus = useCallback(
    async (enable: boolean) => {
      if (rule.enabled === enable) {
        return;
      }
      setIsUpdating(true);
      try {
        if (enable) {
          await enableRule();
        } else {
          await disableRule();
        }
        setIsEnabled(!isEnabled);
        onRuleChanged();
      } finally {
        setIsUpdating(false);
      }
    },
    [rule.enabled, isEnabled, onRuleChanged, enableRule, disableRule]
  );

  const onSnoozeRule = useCallback(
    async (snoozeSchedule) => {
      try {
        await snoozeRule(snoozeSchedule);
        onRuleChanged();
      } finally {
        onClosePopover();
      }
    },
    [snoozeRule, onRuleChanged, onClosePopover]
  );

  const onUnsnoozeRule = useCallback(
    async (scheduleIds) => {
      try {
        await unsnoozeRule(scheduleIds);
        onRuleChanged();
      } finally {
        onClosePopover();
      }
    },
    [unsnoozeRule, onRuleChanged, onClosePopover]
  );

  const badgeColor = !isEnabled ? 'default' : isSnoozed ? 'warning' : 'primary';
  const badgeMessage = !isEnabled ? DISABLED : isSnoozed ? SNOOZED : ENABLED;

  const remainingSnoozeTime =
    isEnabled && isSnoozed ? (
      <EuiToolTip
        content={
          rule.muteAll
            ? INDEFINITELY
            : moment(new Date(rule.isSnoozedUntil!)).format(SNOOZE_END_TIME_FORMAT)
        }
      >
        <EuiText color="subdued" size="xs">
          {rule.muteAll ? INDEFINITELY : moment(new Date(rule.isSnoozedUntil!)).fromNow(true)}
        </EuiText>
      </EuiToolTip>
    ) : null;

  const nonEditableBadge = (
    <EuiBadge color={badgeColor} data-test-subj="statusDropdownReadonly">
      {badgeMessage}
    </EuiBadge>
  );

  const editableBadge = (
    <EuiBadge
      color={badgeColor}
      iconSide="right"
      iconType={!isUpdating && isEditable ? 'arrowDown' : undefined}
      onClick={onClickBadge}
      iconOnClick={onClickBadge}
      onClickAriaLabel={OPEN_MENU_ARIA_LABEL}
      iconOnClickAriaLabel={OPEN_MENU_ARIA_LABEL}
      isDisabled={isUpdating}
    >
      {badgeMessage}
      {isUpdating && (
        <EuiLoadingSpinner style={{ marginLeft: '4px', marginRight: '4px' }} size="s" />
      )}
    </EuiBadge>
  );

  return (
    <EuiFlexGroup
      direction={direction}
      alignItems={direction === 'row' ? 'center' : 'flexStart'}
      justifyContent="flexStart"
      gutterSize={direction === 'row' ? 's' : 'xs'}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        {isEditable ? (
          <EuiPopover
            button={editableBadge}
            isOpen={isPopoverOpen && isEditable}
            closePopover={onClosePopover}
            panelPaddingSize="s"
            data-test-subj="statusDropdown"
            title={badgeMessage}
          >
            <RuleStatusMenu
              onClosePopover={onClosePopover}
              onChangeEnabledStatus={onChangeEnabledStatus}
              isEnabled={isEnabled}
              isSnoozed={isSnoozed}
              snoozeEndTime={rule.isSnoozedUntil}
              hideSnoozeOption={hideSnoozeOption}
              snoozeRule={onSnoozeRule}
              unsnoozeRule={onUnsnoozeRule}
              scheduledSnoozes={rule.snoozeSchedule}
              activeSnoozes={rule.activeSnoozes}
            />
          </EuiPopover>
        ) : (
          nonEditableBadge
        )}
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="remainingSnoozeTime" grow={false}>
        {remainingSnoozeTime}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface RuleStatusMenuProps {
  onChangeEnabledStatus: (enabled: boolean) => void;
  onClosePopover: () => void;
  isEnabled: boolean;
  isSnoozed: boolean;
  snoozeEndTime?: Date | null;
  hideSnoozeOption?: boolean;
  snoozeRule: (snoozeSchedule: SnoozeSchedule) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  scheduledSnoozes?: RuleSnooze;
  activeSnoozes?: string[];
}

const RuleStatusMenu: React.FunctionComponent<RuleStatusMenuProps> = ({
  onChangeEnabledStatus,
  onClosePopover,
  isEnabled,
  isSnoozed,
  snoozeEndTime,
  hideSnoozeOption = false,
  snoozeRule,
  unsnoozeRule,
  scheduledSnoozes = [],
  activeSnoozes = [],
}) => {
  const enableRule = useCallback(() => {
    if (isSnoozed) {
      // Unsnooze if the rule is snoozed and the user clicks Enabled
      unsnoozeRule();
    } else {
      onChangeEnabledStatus(true);
    }
    onClosePopover();
  }, [onChangeEnabledStatus, onClosePopover, unsnoozeRule, isSnoozed]);
  const disableRule = useCallback(() => {
    onChangeEnabledStatus(false);
    onClosePopover();
  }, [onChangeEnabledStatus, onClosePopover]);

  let snoozeButtonTitle = <EuiText size="s">{SNOOZE}</EuiText>;
  if (isSnoozed && snoozeEndTime) {
    snoozeButtonTitle = (
      <>
        <EuiText size="s">{SNOOZE}</EuiText>{' '}
        <EuiText size="xs" color="subdued">
          {moment(snoozeEndTime).format(SNOOZE_END_TIME_FORMAT)}
        </EuiText>
      </>
    );
  }

  const getSnoozeMenuItem = () => {
    if (!hideSnoozeOption) {
      return [
        {
          name: snoozeButtonTitle,
          icon: isEnabled && isSnoozed ? 'check' : 'empty',
          panel: 1,
          disabled: !isEnabled,
          'data-test-subj': 'statusDropdownSnoozeItem',
        },
      ];
    }
    return [];
  };

  const getSnoozePanel = () => {
    if (!hideSnoozeOption) {
      return [
        {
          id: 1,
          width: 400,
          title: SNOOZE,
          content: (
            <EuiPanel paddingSize="none" hasShadow={false}>
              <SnoozePanel
                interval={futureTimeToInterval(snoozeEndTime)}
                showCancel={isSnoozed}
                snoozeRule={snoozeRule}
                unsnoozeRule={unsnoozeRule}
                scheduledSnoozes={scheduledSnoozes}
                activeSnoozes={activeSnoozes}
                hasTitle={false}
              />
            </EuiPanel>
          ),
        },
      ];
    }
    return [];
  };

  const panels = [
    {
      id: 0,
      width: 360,
      items: [
        {
          name: ENABLED,
          icon: isEnabled && !isSnoozed ? 'check' : 'empty',
          onClick: enableRule,
          'data-test-subj': 'statusDropdownEnabledItem',
        },
        {
          name: DISABLED,
          icon: !isEnabled ? 'check' : 'empty',
          onClick: disableRule,
          'data-test-subj': 'statusDropdownDisabledItem',
        },
        ...getSnoozeMenuItem(),
      ],
    },
    ...getSnoozePanel(),
  ];

  return <EuiContextMenu data-test-subj="ruleStatusMenu" initialPanelId={0} panels={panels} />;
};

export const futureTimeToInterval = (time?: Date | null) => {
  if (!time) return;
  const relativeTime = moment(time).locale('en').fromNow(true);
  const [valueStr, unitStr] = relativeTime.split(' ');
  let value = valueStr === 'a' || valueStr === 'an' ? 1 : parseInt(valueStr, 10);
  let unit;
  switch (unitStr) {
    case 'year':
    case 'years':
      unit = 'M';
      value = value * 12;
      break;
    case 'month':
    case 'months':
      unit = 'M';
      break;
    case 'day':
    case 'days':
      unit = 'd';
      break;
    case 'hour':
    case 'hours':
      unit = 'h';
      break;
    case 'minute':
    case 'minutes':
      unit = 'm';
      break;
  }

  if (!unit) return;
  return `${value}${unit}`;
};

const ENABLED = i18n.translate('xpack.triggersActionsUI.sections.rulesList.enabledRuleStatus', {
  defaultMessage: 'Enabled',
});

const DISABLED = i18n.translate('xpack.triggersActionsUI.sections.rulesList.disabledRuleStatus', {
  defaultMessage: 'Disabled',
});

const SNOOZED = i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozedRuleStatus', {
  defaultMessage: 'Snoozed',
});

const SNOOZE = i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeMenuTitle', {
  defaultMessage: 'Snooze',
});

const OPEN_MENU_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusDropdownMenuLabel',
  {
    defaultMessage: 'Change rule status or snooze',
  }
);

const INDEFINITELY = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.remainingSnoozeIndefinite',
  { defaultMessage: 'Indefinitely' }
);

// eslint-disable-next-line import/no-default-export
export { RuleStatusDropdown as default };
