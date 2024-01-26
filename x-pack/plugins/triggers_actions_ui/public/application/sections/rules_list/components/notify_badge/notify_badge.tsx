/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextAlign,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../common/lib/kibana';
import { SnoozeSchedule } from '../../../../../types';
import { i18nAbbrMonthDayDate, i18nMonthDayDate } from '../../../../lib/i18n_month_day_date';
import { SnoozePanel, futureTimeToInterval } from '../rule_snooze';
import { getNextRuleSnoozeSchedule, isRuleSnoozed } from './helpers';
import {
  OPEN_SNOOZE_PANEL_ARIA_LABEL,
  SNOOZE_FAILED_MESSAGE,
  SNOOZE_SUCCESS_MESSAGE,
  UNSNOOZE_SUCCESS_MESSAGE,
  UNITS_TRANSLATION,
} from './translations';
import { RulesListNotifyBadgeProps } from './types';

function getTimeRemaining(endtime: Date): string {
  const duration = moment.duration(moment(endtime).diff(moment()));
  const timeValues = {
    years: UNITS_TRANSLATION.getYearsTranslation(duration.years()),
    months: UNITS_TRANSLATION.getMonthsTranslation(duration.months()),
    weeks: UNITS_TRANSLATION.getWeeksTranslation(duration.weeks()),
    days: UNITS_TRANSLATION.getDaysTranslation(duration.days()),
    hours: UNITS_TRANSLATION.getHoursTranslation(duration.hours()),
    minutes: UNITS_TRANSLATION.getMinutesTranslation(duration.minutes()),
    seconds: UNITS_TRANSLATION.getSecondsTranslation(duration.seconds()),
  };
  const timeComponents = Object.entries(timeValues)
    .filter(([unit, value]) => value !== '' && value !== `0 ${unit}`)
    .map(([unit, value]) => `${value}`)
    .join(', ');
  const lastComponentIndex = timeComponents.lastIndexOf(', ');
  const formattedTime =
    lastComponentIndex === -1
      ? timeComponents
      : timeComponents.slice(0, lastComponentIndex) +
        ' and' +
        timeComponents.slice(lastComponentIndex + 1);
  return formattedTime;
}

export const RulesListNotifyBadge: React.FunctionComponent<RulesListNotifyBadgeProps> = ({
  snoozeSettings,
  loading = false,
  disabled = false,
  onRuleChanged,
  snoozeRule,
  unsnoozeRule,
  showOnHover = false,
  showTooltipInline = false,
}) => {
  const [requestInFlight, setRequestInFlightLoading] = useState(false);
  const isLoading = loading || requestInFlight;
  const isDisabled = Boolean(disabled) || !snoozeSettings;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), [setIsPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);
  const isSnoozedUntil = snoozeSettings?.isSnoozedUntil;
  const muteAll = snoozeSettings?.muteAll ?? false;
  const isSnoozedIndefinitely = muteAll;
  const isSnoozed = useMemo(
    () => (snoozeSettings ? isRuleSnoozed(snoozeSettings) : false),
    [snoozeSettings]
  );
  const nextScheduledSnooze = useMemo(
    () => (snoozeSettings ? getNextRuleSnoozeSchedule(snoozeSettings) : null),
    [snoozeSettings]
  );

  const snoozeTimeLeft = useMemo(
    () => (isSnoozedUntil ? getTimeRemaining(isSnoozedUntil) : undefined),
    [isSnoozedUntil]
  );

  const {
    notifications: { toasts },
  } = useKibana().services;

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
    if (isSnoozed && snoozeTimeLeft) {
      return (
        <EuiToolTip
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.timeRemaining',
            {
              defaultMessage: 'Time remaining',
            }
          )}
          content={
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <span>{snoozeTimeLeft}</span>
              </EuiFlexItem>
              <EuiSpacer />
              <EuiFlexItem grow={false}>
                <span>{isSnoozedUntil?.toString()}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiTextAlign>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.snoozedTooltip',
              {
                defaultMessage: 'Notifications snoozing for {snoozeTime}',
                values: {
                  snoozeTime: moment(isSnoozedUntil).fromNow(true),
                },
              }
            )}
          </EuiTextAlign>
        </EuiToolTip>
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
    showTooltipInline,
    nextScheduledSnooze,
    snoozeTimeLeft,
    isSnoozedUntil,
  ]);

  const snoozedButton = useMemo(() => {
    return (
      <EuiButton
        size="s"
        isLoading={isLoading}
        disabled={isLoading || isDisabled}
        data-test-subj="rulesListNotifyBadge-snoozed"
        aria-label={OPEN_SNOOZE_PANEL_ARIA_LABEL}
        minWidth={85}
        iconType="bellSlash"
        color="accent"
        onClick={openPopover}
      >
        <EuiText size="xs">{formattedSnoozeText}</EuiText>
      </EuiButton>
    );
  }, [formattedSnoozeText, isLoading, isDisabled, openPopover]);

  const scheduledSnoozeButton = useMemo(() => {
    return (
      <EuiButton
        size="s"
        isLoading={isLoading}
        disabled={isLoading || isDisabled}
        data-test-subj="rulesListNotifyBadge-scheduled"
        minWidth={85}
        iconType="calendar"
        color="text"
        aria-label={OPEN_SNOOZE_PANEL_ARIA_LABEL}
        onClick={openPopover}
      >
        <EuiText size="xs">{formattedSnoozeText}</EuiText>
      </EuiButton>
    );
  }, [formattedSnoozeText, isLoading, isDisabled, openPopover]);

  const unsnoozedButton = useMemo(() => {
    // This show on hover is needed because we need style sheets to achieve the
    // show on hover effect in the rules list. However we don't want this to be
    // a default behaviour of this component.
    const showOnHoverClass = showOnHover ? 'ruleSidebarItem__action' : '';
    return (
      <EuiButtonIcon
        size="s"
        isLoading={isLoading}
        disabled={isLoading || isDisabled}
        display={isLoading ? 'base' : 'empty'}
        data-test-subj="rulesListNotifyBadge-unsnoozed"
        aria-label={OPEN_SNOOZE_PANEL_ARIA_LABEL}
        className={isPopoverOpen || isLoading ? '' : showOnHoverClass}
        iconType="bell"
        onClick={openPopover}
      />
    );
  }, [isPopoverOpen, isLoading, isDisabled, showOnHover, openPopover]);

  const indefiniteSnoozeButton = useMemo(() => {
    return (
      <EuiButtonIcon
        size="s"
        isLoading={isLoading}
        disabled={isLoading || isDisabled}
        display="base"
        data-test-subj="rulesListNotifyBadge-snoozedIndefinitely"
        aria-label={OPEN_SNOOZE_PANEL_ARIA_LABEL}
        iconType="bellSlash"
        color="accent"
        onClick={openPopover}
      />
    );
  }, [isLoading, isDisabled, openPopover]);

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
    const tooltipContent =
      typeof disabled === 'string'
        ? disabled
        : isPopoverOpen || showTooltipInline
        ? undefined
        : snoozeTimeLeft;
    return (
      <EuiToolTip
        title={
          tooltipContent
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.rulesListNotifyBadge.timeRemaining',
                {
                  defaultMessage: 'Time remaining',
                }
              )
            : undefined
        }
        content={tooltipContent}
      >
        {button}
      </EuiToolTip>
    );
  }, [disabled, isPopoverOpen, button, showTooltipInline, snoozeTimeLeft]);

  const onApplySnooze = useCallback(
    async (schedule: SnoozeSchedule) => {
      try {
        setRequestInFlightLoading(true);
        closePopover();
        await snoozeRule(schedule);
        await onRuleChanged();
        toasts.addSuccess(SNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        setRequestInFlightLoading(false);
      }
    },
    [setRequestInFlightLoading, snoozeRule, onRuleChanged, toasts, closePopover]
  );

  const onApplyUnsnooze = useCallback(
    async (scheduleIds?: string[]) => {
      try {
        setRequestInFlightLoading(true);
        closePopover();
        await unsnoozeRule(scheduleIds);
        await onRuleChanged();
        toasts.addSuccess(UNSNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        setRequestInFlightLoading(false);
      }
    },
    [setRequestInFlightLoading, unsnoozeRule, onRuleChanged, toasts, closePopover]
  );

  const popover = (
    <EuiPopover
      data-test-subj="rulesListNotifyBadge"
      isOpen={isPopoverOpen && !isDisabled}
      closePopover={closePopover}
      button={buttonWithToolTip}
      anchorPosition="rightCenter"
      panelStyle={{ maxHeight: '100vh', overflowY: 'auto' }}
    >
      <SnoozePanel
        snoozeRule={onApplySnooze}
        unsnoozeRule={onApplyUnsnooze}
        interval={futureTimeToInterval(isSnoozedUntil)}
        showCancel={isSnoozed}
        scheduledSnoozes={snoozeSettings?.snoozeSchedule ?? []}
        activeSnoozes={snoozeSettings?.activeSnoozes ?? []}
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
