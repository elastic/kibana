/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiDatePicker,
  EuiFormControlLayout,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSplitPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { Moment } from 'moment';
import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { NumberField } from '../helpers/number_field';
import { RRuleFrequency, RecurrenceSchedule } from '../../../../../../types';
import { i18nMonthDayDate } from '../../../../../lib/i18n_month_day_date';
import {
  DEFAULT_REPEAT_OPTIONS,
  DEFAULT_RRULE_PRESETS,
  ISO_WEEKDAYS_TO_RRULE,
  RECURRENCE_END_OPTIONS,
} from './constants';
import { CustomRecurrenceScheduler } from './custom_recurrence_scheduler';
import {
  CustomFrequencyState,
  generateNthByweekday,
  getWeekdayInfo,
  recurrenceSummary,
} from './helpers';
import { i18nNthWeekday } from './translations';

import './recurrence_scheduler.scss';

interface ComponentOpts {
  startDate: Moment | null;
  endDate: Moment | null;
  initialState: RecurrenceSchedule | null;
  onChange: (schedule: RecurrenceSchedule) => void;
}

export const RecurrenceScheduler: React.FC<ComponentOpts> = ({
  startDate,
  endDate,
  onChange,
  initialState,
}) => {
  const hasInitialized = useRef(false);
  const [frequency, setFrequency] = useState<RRuleFrequency | 'CUSTOM'>(RRuleFrequency.DAILY);
  const [recurrenceEnds, setRecurrenceEnds] = useState('never');

  const [customFrequency, setCustomFrequency] = useState<CustomFrequencyState>({
    freq: RRuleFrequency.WEEKLY,
    interval: 1,
    byweekday: [],
    bymonthday: [],
    bymonth: [],
  });

  const [recurrenceEndDate, setRecurrenceEndDate] = useState(endDate);
  const [occurrences, setOccurrrences] = useState(1);

  const snoozeDurationInDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.abs(startDate.diff(endDate, 'days'));
  }, [startDate, endDate]);

  const disableDailyOption = useMemo(() => {
    return snoozeDurationInDays > 0;
  }, [snoozeDurationInDays]);

  useEffect(() => {
    if (disableDailyOption && frequency === RRuleFrequency.DAILY) {
      setFrequency(RRuleFrequency.WEEKLY);
    }
  }, [disableDailyOption, frequency]);

  useEffect(() => {
    if (initialState && !hasInitialized.current) {
      const isCustomFrequency =
        initialState.interval > 1 || (initialState.byweekday ?? []).length > 1;
      setFrequency(isCustomFrequency ? 'CUSTOM' : initialState.freq);
      if (isCustomFrequency) {
        setCustomFrequency(initialState as CustomFrequencyState);
      }
      if (initialState.until) {
        setRecurrenceEnds('ondate');
        setRecurrenceEndDate(initialState.until);
      }
      if (initialState.count) {
        setRecurrenceEnds('afterx');
        setOccurrrences(initialState.count);
      }
    }
    hasInitialized.current = true;
  }, [initialState]);

  const { repeatOptions, rrulePresets } = useMemo(() => {
    if (!startDate) {
      return {
        repeatOptions: DEFAULT_REPEAT_OPTIONS,
        rrulePresets: DEFAULT_RRULE_PRESETS,
      };
    }
    const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = getWeekdayInfo(startDate);
    return {
      repeatOptions: [
        {
          text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurDaily', {
            defaultMessage: 'Daily',
          }),
          value: RRuleFrequency.DAILY,
          disabled: disableDailyOption,
        },
        {
          text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeeklyOnWeekday', {
            defaultMessage: 'Weekly on {dayOfWeek}',
            values: { dayOfWeek },
          }),
          value: RRuleFrequency.WEEKLY,
        },
        {
          text: i18nNthWeekday(dayOfWeek)[isLastOfMonth ? 0 : nthWeekdayOfMonth],
          value: RRuleFrequency.MONTHLY,
        },
        {
          text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurYearlyOnDay', {
            defaultMessage: 'Yearly on {date}',
            values: {
              date: i18nMonthDayDate(startDate),
            },
          }),
          value: RRuleFrequency.YEARLY,
        },
        {
          text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurCustom', {
            defaultMessage: 'Custom',
          }),
          value: 'CUSTOM',
        },
      ],
      rrulePresets: {
        [RRuleFrequency.DAILY]: {
          interval: 1,
        },
        [RRuleFrequency.WEEKLY]: {
          interval: 1,
          byweekday: [ISO_WEEKDAYS_TO_RRULE[startDate.isoWeekday()]],
        },
        [RRuleFrequency.MONTHLY]: {
          interval: 1,
          byweekday: generateNthByweekday(startDate),
        },
        [RRuleFrequency.YEARLY]: {
          interval: 1,
          bymonth: [startDate.month() + 1],
          bymonthday: [startDate.date()],
        },
      },
    };
  }, [startDate, disableDailyOption]);

  const compiledRecurrenceSchedule: RecurrenceSchedule = useMemo(() => {
    const recurrenceEndProps =
      recurrenceEnds === 'ondate' && recurrenceEndDate
        ? {
            until: recurrenceEndDate,
          }
        : recurrenceEnds === 'afterx'
        ? {
            count: occurrences,
          }
        : {};
    if (frequency === 'CUSTOM') {
      return { ...rewriteCustomFrequency(customFrequency), ...recurrenceEndProps };
    }
    return {
      freq: frequency,
      ...rrulePresets[frequency],
      ...recurrenceEndProps,
    };
  }, [frequency, rrulePresets, recurrenceEnds, customFrequency, recurrenceEndDate, occurrences]);

  useEffect(() => {
    onChange(compiledRecurrenceSchedule);
  }, [compiledRecurrenceSchedule, onChange]);

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued" className="ramRecurrenceScheduler">
        <EuiFormRow
          display="columnCompressed"
          style={{ alignItems: 'center' }}
          fullWidth
          label={i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.repeatLabel', {
            defaultMessage: 'Repeat',
          })}
        >
          <EuiSelect
            options={repeatOptions}
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value === 'CUSTOM' ? 'CUSTOM' : Number(e.target.value))
            }
            compressed
          />
        </EuiFormRow>
        {frequency === 'CUSTOM' && (
          <CustomRecurrenceScheduler
            startDate={startDate}
            onChange={setCustomFrequency}
            initialState={customFrequency}
            minimumRecurrenceDays={snoozeDurationInDays + 1}
          />
        )}
        <EuiFormRow
          display="columnCompressed"
          style={{ alignItems: 'center' }}
          fullWidth
          label={i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.endsLabel', {
            defaultMessage: 'Ends',
          })}
        >
          <EuiButtonGroup
            buttonSize="compressed"
            isFullWidth
            type="single"
            legend="Recurrence ends"
            idSelected={recurrenceEnds}
            onChange={setRecurrenceEnds}
            options={RECURRENCE_END_OPTIONS}
          />
        </EuiFormRow>
        {recurrenceEnds === 'ondate' && (
          <EuiFormRow
            display="columnCompressed"
            style={{ alignItems: 'center' }}
            label=" "
            fullWidth
          >
            <EuiDatePicker
              selected={recurrenceEndDate}
              onChange={setRecurrenceEndDate}
              minDate={startDate ?? moment()}
            />
          </EuiFormRow>
        )}
        {recurrenceEnds === 'afterx' && (
          <EuiFormRow
            display="columnCompressed"
            style={{ alignItems: 'center' }}
            label=" "
            fullWidth
          >
            <EuiFormControlLayout
              compressed
              prepend={i18n.translate(
                'xpack.triggersActionsUI.ruleSnoozeScheduler.afterOccurrencesLabel',
                {
                  defaultMessage: 'After',
                }
              )}
              append={i18n.translate(
                'xpack.triggersActionsUI.ruleSnoozeScheduler.occurrencesLabel',
                {
                  defaultMessage: '{occurrences, plural, one {occurrence} other {occurrences}}',
                  values: { occurrences },
                }
              )}
            >
              <NumberField
                compressed
                min={1}
                value={occurrences}
                onChange={(value) => setOccurrrences(Number(value))}
              />
            </EuiFormControlLayout>
          </EuiFormRow>
        )}
      </EuiSplitPanel.Inner>
      <EuiHorizontalRule margin="none" />
      <EuiSplitPanel.Inner style={{ maxWidth: '400px' }}>
        {i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.repeatsSummary', {
          defaultMessage: 'Repeats {summary}',
          values: { summary: recurrenceSummary(compiledRecurrenceSchedule) },
        })}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

const rewriteCustomFrequency = (customFreq: CustomFrequencyState) => {
  const result: RecurrenceSchedule = { ...customFreq };
  if (result.byweekday?.length === 0) delete result.byweekday;
  if (result.bymonth?.length === 0) delete result.bymonth;
  if (result.bymonthday?.length === 0) delete result.bymonthday;
  return result;
};
