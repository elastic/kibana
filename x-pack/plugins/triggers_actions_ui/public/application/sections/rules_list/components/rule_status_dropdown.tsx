/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  EuiLoadingSpinner,
  EuiPopover,
  EuiContextMenu,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { Rule } from '../../../../types';

type DropdownRuleRecord = Pick<Rule, 'enabled' | 'muteAll' | 'isSnoozedUntil'>;

export interface ComponentOpts {
  rule: DropdownRuleRecord;
  onRuleChanged: () => void;
  enableRule: () => Promise<void>;
  disableRule: () => Promise<void>;
  isEditable: boolean;
  previousSnoozeInterval?: string | null;
  direction?: 'column' | 'row';
}

const SNOOZE_END_TIME_FORMAT = 'LL @ LT';

export const isRuleSnoozed = (rule: { isSnoozedUntil?: Date | null; muteAll: boolean }) =>
  Boolean(
    (rule.isSnoozedUntil && new Date(rule.isSnoozedUntil).getTime() > Date.now()) || rule.muteAll
  );

export const RuleStatusDropdown: React.FunctionComponent<ComponentOpts> = ({
  rule,
  onRuleChanged,
  disableRule,
  enableRule,
  isEditable,
  previousSnoozeInterval: propsPreviousSnoozeInterval,
  direction = 'column',
}: ComponentOpts) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(rule.enabled);
  const [isSnoozed, setIsSnoozed] = useState<boolean>(isRuleSnoozed(rule));

  useEffect(() => {
    setIsEnabled(rule.enabled);
  }, [rule.enabled]);
  useEffect(() => {
    setIsSnoozed(isRuleSnoozed(rule));
  }, [rule]);
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
}

const RuleStatusMenu: React.FunctionComponent<RuleStatusMenuProps> = ({
  onChangeEnabledStatus,
  onClosePopover,
  isEnabled,
  isSnoozed,
}) => {
  const contextMenuRef = useRef<React.ReactNode>(null);

  const enableRule = useCallback(() => {
    onClosePopover();
  }, [onChangeEnabledStatus, onClosePopover, isSnoozed]);
  const disableRule = useCallback(() => {
    onChangeEnabledStatus(false);
    onClosePopover();
  }, [onChangeEnabledStatus, onClosePopover]);

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
      ],
    },
  ];
  return (
    <EuiContextMenu
      ref={(node) => {
        contextMenuRef.current = node;
      }}
      data-test-subj="ruleStatusMenu"
      initialPanelId={0}
      panels={panels}
    />
  );
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

const INDEFINITELY = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.remainingSnoozeIndefinite',
  { defaultMessage: 'Indefinitely' }
);

const OPEN_MENU_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusDropdownMenuLabel',
  {
    defaultMessage: 'Change rule status or snooze',
  }
);

// eslint-disable-next-line import/no-default-export
export { RuleStatusDropdown as default };
