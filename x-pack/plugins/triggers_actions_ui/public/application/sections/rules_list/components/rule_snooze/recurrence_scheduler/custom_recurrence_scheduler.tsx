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
import deepEqual from 'fast-deep-equal';
import { Moment } from 'moment';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { RRuleFrequency } from '../../../../../../types';
import { I18N_WEEKDAY_OPTIONS } from './constants';
import {
  buildCustomRecurrenceSchedulerState,
  CustomFrequencyState,
  getInitialByweekday,
  getWeekdayInfo,
} from './helpers';
import { i18nEndControlOptions, i18nNthWeekdayShort } from './translations';

// FIXME https://github.com/elastic/eui/issues/5958 and https://github.com/elastic/eui/issues/6040
const EuiFormRowWithDelimitedFixer = euiStyled(EuiFormRow)`
  & .euiFormControlLayout__childrenWrapper {
    height: 100%;
    &:last-of-type {
      position: relative;
      & .euiFormControlLayoutIcons {
        position: absolute;
        padding: 0;
      }
    }
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
  }, [startDate, initialStartDate]);

  const customRecurrenceSchedulerState = useRef<CustomFrequencyState | null>(null);
  useEffect(() => {
    const nextState = buildCustomRecurrenceSchedulerState({
      frequency,
      interval,
      byweekday,
      monthlyRecurDay,
      startDate,
    });
    if (!deepEqual(customRecurrenceSchedulerState.current, nextState)) {
      onChange(nextState);
      customRecurrenceSchedulerState.current = nextState;
    }
  }, [frequency, interval, byweekday, monthlyRecurDay, startDate, onChange]);

  const onToggleWeekday = useCallback(
    (id: string) => {
      const newByweekday = { ...byweekday, [id]: !byweekday[id as keyof typeof byweekday] };
      // Don't allow the user to deselect all weekdays
      if (!Object.values(newByweekday).every((v) => v === false)) {
        setByweekday(newByweekday);
      }
    },
    [byweekday]
  );

  const endControlOptions = useMemo(() => i18nEndControlOptions(interval), [interval]);

  return (
    <>
      <EuiFormRowWithDelimitedFixer data-test-subj="customRecurrenceScheduler" fullWidth label=" ">
        <EuiFormControlLayoutDelimited
          compressed
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
              compressed
              className="customRecurrenceSchedulerFrequency"
              data-test-subj="customRecurrenceSchedulerFrequency"
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
          data-test-subj="customRecurrenceSchedulerWeekly"
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
        <EuiFormRow fullWidth data-test-subj="customRecurrenceSchedulerMonthly">
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
