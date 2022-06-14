/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFormControlLayoutDelimited,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { Moment } from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { RRuleFrequency } from '../../../../../../types';
import { ISO_WEEKDAYS_TO_RRULE, I18N_WEEKDAY_OPTIONS } from './constants';
import {
  CustomFrequencyState,
  generateNthByweekday,
  getInitialByweekday,
  getWeekdayInfo,
} from './helpers';
import { i18nNthWeekdayShort } from './translations';

// FIXME https://github.com/elastic/eui/issues/5958
const EuiFormRowWithDelimitedFixer = euiStyled(EuiFormRow)`
  & .euiFormControlLayout__childrenWrapper {
    height: 100%;
  }
`;

interface CustomRecurrenceSchedulerProps {
  startDate: Moment | null;
  onChange: (state: CustomFrequencyState) => void;
  initialState: CustomFrequencyState;
}

export const CustomRecurrenceScheduler: React.FC<CustomRecurrenceSchedulerProps> = ({
  startDate,
  onChange,
  initialState,
}) => {
  const [initialStartDate] = useState(startDate);
  const [frequency, setFrequency] = useState(initialState.freq);
  const [interval, setInterval] = useState(initialState.interval);
  const [byweekday, setByweekday] = useState(
    getInitialByweekday(initialState.byweekday, startDate)
  );
  const [monthlyRecurDay, setMonthlyRecurDay] = useState(
    initialState.freq === RRuleFrequency.MONTHLY && initialState.byweekday.length > 0
      ? 'weekday'
      : 'day'
  );

  const monthlyRecurDayOptions = useMemo(() => {
    if (!startDate) return [];
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(startDate);
    return [
      {
        id: 'day',
        label: i18n.translate(
          'xpack.triggersActionsUI.ruleSnoozeScheduler.repeatOnMonthlyDayNumber',
          {
            defaultMessage: 'On day {dayNumber}',
            values: { dayNumber: startDate.date() },
          }
        ),
      },
      {
        id: 'weekday',
        label: i18nNthWeekdayShort(dayOfWeek!)[isLastOfMonth ? 0 : nthWeekdayOfMonth!],
      },
    ];
  }, [startDate]);

  useEffect(() => {
    if (initialStartDate !== startDate) setByweekday(getInitialByweekday([], startDate));
  }, [setByweekday, startDate, initialStartDate]);

  useEffect(() => {
    const isMonthlyByDay = frequency === RRuleFrequency.MONTHLY && monthlyRecurDay === 'day';
    const isMonthlyByWeekday =
      frequency === RRuleFrequency.MONTHLY && monthlyRecurDay === 'weekday';
    const useByMonthDay = startDate && (isMonthlyByDay || frequency === RRuleFrequency.YEARLY);

    const configuredByweekday =
      // If weekly frequency is selected, pull byweekday from chosen days
      frequency === RRuleFrequency.WEEKLY
        ? Object.keys(byweekday)
            .filter((k) => byweekday[k] === true)
            .map((n) => ISO_WEEKDAYS_TO_RRULE[Number(n)])
        : // If monthly frequency is selected with the nth weekday option, pull byweekday from the configured startDate
        startDate && isMonthlyByWeekday
        ? generateNthByweekday(startDate)
        : [];

    const bymonthday = useByMonthDay ? [startDate.date()] : [];
    const bymonth = startDate && frequency === RRuleFrequency.YEARLY ? [startDate.month()] : [];
    const nextState = {
      freq: frequency,
      interval,
      byweekday: configuredByweekday,
      bymonthday,
      bymonth,
    };
    onChange(nextState);
  }, [frequency, interval, byweekday, monthlyRecurDay, startDate, onChange]);

  const onToggleWeekday = useCallback(
    (id: string) => {
      const newByweekday = { ...byweekday, [id]: !byweekday[id as keyof typeof byweekday] };
      // Don't allow the user to deselect all weekdays
      if (!Object.values(newByweekday).every((v) => v === false)) {
        setByweekday(newByweekday);
      }
    },
    [byweekday, setByweekday]
  );

  const endControlOptions = useMemo(
    () => [
      {
        text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurDay', {
          defaultMessage: '{interval, plural, one {day} other {days}}',
          values: { interval },
        }),
        value: RRuleFrequency.DAILY,
      },
      {
        text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeek', {
          defaultMessage: '{interval, plural, one {week} other {weeks}}',
          values: { interval },
        }),
        value: RRuleFrequency.WEEKLY,
      },
      {
        text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurMonth', {
          defaultMessage: '{interval, plural, one {month} other {months}}',
          values: { interval },
        }),
        value: RRuleFrequency.MONTHLY,
      },
      {
        text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurYear', {
          defaultMessage: '{interval, plural, one {year} other {years}}',
          values: { interval },
        }),
        value: RRuleFrequency.YEARLY,
      },
    ],
    [interval]
  );

  return (
    <>
      <EuiFormRowWithDelimitedFixer style={{ alignItems: 'center' }} fullWidth label=" ">
        <EuiFormControlLayoutDelimited
          compressed
          fullWidth
          delimiter=""
          prepend={i18n.translate(
            'xpack.triggersActionsUI.ruleSnoozeScheduler.repeatIntervalLabel',
            {
              defaultMessage: 'Every',
            }
          )}
          startControl={
            <EuiFieldNumber
              min={1}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          }
          endControl={
            <EuiSelect
              onChange={(e) => setFrequency(Number(e.target.value))}
              value={frequency}
              options={endControlOptions}
            />
          }
        />
      </EuiFormRowWithDelimitedFixer>
      {frequency === RRuleFrequency.WEEKLY && (
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.triggersActionsUI.ruleSnoozeScheduler.repeatOnWeekdayLabel',
            {
              defaultMessage: 'Repeat on',
            }
          )}
        >
          <EuiButtonGroup
            buttonSize="compressed"
            isFullWidth
            type="multi"
            legend="Repeat on weekday"
            idToSelectedMap={byweekday}
            onChange={onToggleWeekday}
            options={I18N_WEEKDAY_OPTIONS}
          />
        </EuiFormRow>
      )}
      {frequency === RRuleFrequency.MONTHLY && startDate && (
        <EuiFormRow fullWidth>
          <EuiButtonGroup
            buttonSize="compressed"
            isFullWidth
            type="single"
            legend="Repeat on weekday or month day"
            idSelected={monthlyRecurDay}
            onChange={setMonthlyRecurDay}
            options={monthlyRecurDayOptions}
          />
        </EuiFormRow>
      )}
    </>
  );
};
