/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  useGeneratedHtmlId,
  EuiLoadingSpinner,
  EuiPopover,
  EuiContextMenu,
  EuiBadge,
  EuiPanel,
  EuiFieldNumber,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiHorizontalRule,
  EuiTitle,
  EuiFlexGrid,
  EuiSpacer,
  EuiLink,
  EuiText,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { parseInterval } from '../../../../../common';

import { Rule } from '../../../../types';

export type SnoozeUnit = 'm' | 'h' | 'd' | 'w' | 'M';
const SNOOZE_END_TIME_FORMAT = 'LL @ LT';

type DropdownRuleRecord = Pick<Rule, 'enabled' | 'muteAll' | 'isSnoozedUntil'>;

export interface ComponentOpts {
  rule: DropdownRuleRecord;
  onRuleChanged: () => void;
  enableRule: () => Promise<void>;
  disableRule: () => Promise<void>;
  snoozeRule: (snoozeEndTime: string | -1, interval: string | null) => Promise<void>;
  unsnoozeRule: () => Promise<void>;
  isEditable: boolean;
  previousSnoozeInterval?: string | null;
  direction?: 'column' | 'row';
  hideSnoozeOption?: boolean;
}

const COMMON_SNOOZE_TIMES: Array<[number, SnoozeUnit]> = [
  [1, 'h'],
  [3, 'h'],
  [8, 'h'],
  [1, 'd'],
];

const PREV_SNOOZE_INTERVAL_KEY = 'triggersActionsUi_previousSnoozeInterval';
export const usePreviousSnoozeInterval: (
  p?: string | null
) => [string | null, (n: string) => void] = (propsInterval) => {
  let intervalFromStorage = localStorage.getItem(PREV_SNOOZE_INTERVAL_KEY);
  if (intervalFromStorage) {
    try {
      parseInterval(intervalFromStorage);
    } catch (e) {
      intervalFromStorage = null;
      localStorage.removeItem(PREV_SNOOZE_INTERVAL_KEY);
    }
  }
  const usePropsInterval = typeof propsInterval !== 'undefined';
  const interval = usePropsInterval ? propsInterval : intervalFromStorage;
  const [previousSnoozeInterval, setPreviousSnoozeInterval] = useState<string | null>(interval);
  const storeAndSetPreviousSnoozeInterval = (newInterval: string) => {
    if (newInterval.startsWith('-')) throw new Error('Cannot store a negative interval');
    if (!usePropsInterval) {
      localStorage.setItem(PREV_SNOOZE_INTERVAL_KEY, newInterval);
    }
    setPreviousSnoozeInterval(newInterval);
  };
  return [previousSnoozeInterval, storeAndSetPreviousSnoozeInterval];
};

export const isRuleSnoozed = (rule: { isSnoozedUntil?: Date | null; muteAll: boolean }) =>
  Boolean(
    (rule.isSnoozedUntil && new Date(rule.isSnoozedUntil).getTime() > Date.now()) || rule.muteAll
  );

export const RuleStatusDropdown: React.FunctionComponent<ComponentOpts> = ({
  rule,
  onRuleChanged,
  disableRule,
  enableRule,
  snoozeRule,
  unsnoozeRule,
  isEditable,
  previousSnoozeInterval: propsPreviousSnoozeInterval,
  hideSnoozeOption = false,
  direction = 'column',
}: ComponentOpts) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(rule.enabled);
  const [isSnoozed, setIsSnoozed] = useState<boolean>(isRuleSnoozed(rule));
  const [previousSnoozeInterval, setPreviousSnoozeInterval] = usePreviousSnoozeInterval(
    propsPreviousSnoozeInterval
  );

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
  const snoozeRuleAndStoreInterval = useCallback(
    (snoozeEndTime: string | -1, interval: string | null) => {
      if (interval) {
        setPreviousSnoozeInterval(interval);
      }
      return snoozeRule(snoozeEndTime, interval);
    },
    [setPreviousSnoozeInterval, snoozeRule]
  );

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
  const onChangeSnooze = useCallback(
    async (value: number, unit?: SnoozeUnit) => {
      setIsUpdating(true);
      try {
        if (value === -1) {
          await snoozeRuleAndStoreInterval(-1, null);
        } else if (value !== 0) {
          const snoozeEndTime = moment().add(value, unit).toISOString();
          await snoozeRuleAndStoreInterval(snoozeEndTime, `${value}${unit}`);
        } else await unsnoozeRule();
        setIsSnoozed(value !== 0);
        onRuleChanged();
      } finally {
        setIsUpdating(false);
      }
    },
    [setIsUpdating, setIsSnoozed, onRuleChanged, snoozeRuleAndStoreInterval, unsnoozeRule]
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
              onChangeSnooze={onChangeSnooze}
              isEnabled={isEnabled}
              isSnoozed={isSnoozed}
              snoozeEndTime={rule.isSnoozedUntil}
              previousSnoozeInterval={previousSnoozeInterval}
              hideSnoozeOption={hideSnoozeOption}
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
  onChangeSnooze: (value: number | -1, unit?: SnoozeUnit) => void;
  onClosePopover: () => void;
  isEnabled: boolean;
  isSnoozed: boolean;
  snoozeEndTime?: Date | null;
  previousSnoozeInterval: string | null;
  hideSnoozeOption?: boolean;
}

const RuleStatusMenu: React.FunctionComponent<RuleStatusMenuProps> = ({
  onChangeEnabledStatus,
  onChangeSnooze,
  onClosePopover,
  isEnabled,
  isSnoozed,
  snoozeEndTime,
  previousSnoozeInterval,
  hideSnoozeOption = false,
}) => {
  const enableRule = useCallback(() => {
    if (isSnoozed) {
      // Unsnooze if the rule is snoozed and the user clicks Enabled
      onChangeSnooze(0, 'm');
    } else {
      onChangeEnabledStatus(true);
    }
    onClosePopover();
  }, [onChangeEnabledStatus, onClosePopover, onChangeSnooze, isSnoozed]);
  const disableRule = useCallback(() => {
    onChangeEnabledStatus(false);
    onClosePopover();
  }, [onChangeEnabledStatus, onClosePopover]);

  const onApplySnooze = useCallback(
    (value: number, unit?: SnoozeUnit) => {
      onChangeSnooze(value, unit);
      onClosePopover();
    },
    [onClosePopover, onChangeSnooze]
  );

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
          width: 360,
          title: SNOOZE,
          content: (
            <EuiPanel paddingSize="none">
              <SnoozePanel
                applySnooze={onApplySnooze}
                interval={futureTimeToInterval(snoozeEndTime)}
                showCancel={isSnoozed}
                previousSnoozeInterval={previousSnoozeInterval}
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

interface SnoozePanelProps {
  interval?: string;
  isLoading?: boolean;
  applySnooze: (value: number | -1, unit?: SnoozeUnit) => void;
  showCancel: boolean;
  previousSnoozeInterval: string | null;
}

export const SnoozePanel: React.FunctionComponent<SnoozePanelProps> = ({
  interval = '3d',
  isLoading = false,
  applySnooze,
  showCancel,
  previousSnoozeInterval,
}) => {
  const [intervalValue, setIntervalValue] = useState(parseInterval(interval).value);
  const [intervalUnit, setIntervalUnit] = useState(parseInterval(interval).unit);

  const onChangeValue = useCallback(
    ({ target }) => setIntervalValue(target.value),
    [setIntervalValue]
  );
  const onChangeUnit = useCallback(
    ({ target }) => setIntervalUnit(target.value),
    [setIntervalUnit]
  );

  const onApplyIndefinite = useCallback(() => applySnooze(-1), [applySnooze]);
  const onClickApplyButton = useCallback(
    () => applySnooze(intervalValue, intervalUnit as SnoozeUnit),
    [applySnooze, intervalValue, intervalUnit]
  );
  const onCancelSnooze = useCallback(() => applySnooze(0, 'm'), [applySnooze]);

  const parsedPrevSnooze = previousSnoozeInterval ? parseInterval(previousSnoozeInterval) : null;
  const prevSnoozeEqualsCurrentSnooze =
    parsedPrevSnooze?.value === intervalValue && parsedPrevSnooze?.unit === intervalUnit;
  const previousButton = parsedPrevSnooze && !prevSnoozeEqualsCurrentSnooze && (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            style={{ height: '1em' }}
            iconType="refresh"
            data-test-subj="ruleSnoozePreviousButton"
            onClick={() => applySnooze(parsedPrevSnooze.value, parsedPrevSnooze.unit as SnoozeUnit)}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.rulesList.previousSnooze', {
              defaultMessage: 'Previous',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s" data-test-subj="ruleSnoozePreviousText">
            {durationToTextString(parsedPrevSnooze.value, parsedPrevSnooze.unit as SnoozeUnit)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
    </>
  );
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup data-test-subj="snoozePanel" gutterSize="xs">
        <EuiFlexItem>
          <EuiFieldNumber
            min={1}
            value={intervalValue}
            onChange={onChangeValue}
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.snoozePanelIntervalValueLabel',
              { defaultMessage: 'Snooze interval value' }
            )}
            data-test-subj="ruleSnoozeIntervalValue"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiSelect
            id={useGeneratedHtmlId({ prefix: 'snoozeUnit' })}
            value={intervalUnit}
            onChange={onChangeUnit}
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.snoozePanelIntervalUnitLabel',
              { defaultMessage: 'Snooze interval unit' }
            )}
            options={[
              { value: 'm', text: MINUTES },
              { value: 'h', text: HOURS },
              { value: 'd', text: DAYS },
              { value: 'w', text: WEEKS },
              { value: 'M', text: MONTHS },
            ]}
            data-test-subj="ruleSnoozeIntervalUnit"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            disabled={!intervalValue || intervalValue < 1}
            isLoading={isLoading}
            onClick={onClickApplyButton}
            data-test-subj="ruleSnoozeApply"
          >
            {i18n.translate('xpack.triggersActionsUI.sections.rulesList.applySnooze', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {previousButton}
      <EuiFlexGrid columns={2} gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeCommonlyUsed', {
                defaultMessage: 'Commonly used',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem />
        {COMMON_SNOOZE_TIMES.map(([value, unit]) => (
          <EuiFlexItem key={`snooze-${value}${unit}`}>
            <EuiLink onClick={() => applySnooze(value, unit)}>
              {durationToTextString(value, unit)}
            </EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiLink onClick={onApplyIndefinite} data-test-subj="ruleSnoozeIndefiniteApply">
            {i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeIndefinitely', {
              defaultMessage: 'Snooze indefinitely',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showCancel && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiButton
                isLoading={isLoading}
                color="danger"
                onClick={onCancelSnooze}
                data-test-subj="ruleSnoozeCancel"
              >
                Cancel snooze
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="s" />
    </>
  );
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

const durationToTextString = (value: number, unit: SnoozeUnit) => {
  // Moment.humanize will parse "1" as "a" or "an", e.g "an hour"
  // Override this to output "1 hour"
  if (value === 1) {
    return ONE[unit];
  }
  return moment.duration(value, unit).humanize();
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

const MINUTES = i18n.translate('xpack.triggersActionsUI.sections.rulesList.minutesLabel', {
  defaultMessage: 'minutes',
});
const HOURS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.hoursLabel', {
  defaultMessage: 'hours',
});
const DAYS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.daysLabel', {
  defaultMessage: 'days',
});
const WEEKS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.weeksLabel', {
  defaultMessage: 'weeks',
});
const MONTHS = i18n.translate('xpack.triggersActionsUI.sections.rulesList.monthsLabel', {
  defaultMessage: 'months',
});

const INDEFINITELY = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.remainingSnoozeIndefinite',
  { defaultMessage: 'Indefinitely' }
);

// i18n constants to override moment.humanize
const ONE: Record<SnoozeUnit, string> = {
  m: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneMinute', {
    defaultMessage: '1 minute',
  }),
  h: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneHour', {
    defaultMessage: '1 hour',
  }),
  d: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneDay', {
    defaultMessage: '1 day',
  }),
  w: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneWeek', {
    defaultMessage: '1 week',
  }),
  M: i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeOneMonth', {
    defaultMessage: '1 month',
  }),
};

// eslint-disable-next-line import/no-default-export
export { RuleStatusDropdown as default };
