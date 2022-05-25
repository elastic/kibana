/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invert, mapValues } from 'lodash';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import {
  EuiDatePicker,
  EuiPanel,
  EuiFormRow,
  EuiSelect,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFormControlLayout,
  EuiFormControlLayoutDelimited,
  EuiHorizontalRule,
} from '@elastic/eui';
import { RRuleFrequency, RecurrenceSchedule } from '../../../../types';

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

interface ComponentOpts {
  startDate: Moment | null;
  endDate: Moment | null;
  initialState: RecurrenceSchedule | null;
  onChange: (schedule: RecurrenceSchedule) => void;
}

interface CustomFrequencyState {
  freq: RRuleFrequency;
  interval: number;
  byweekday: string[];
  bymonthday: number[];
  bymonth: number[];
}

export const RecurrenceScheduler: React.FC<ComponentOpts> = ({
  startDate,
  endDate,
  onChange,
  initialState,
}) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [frequency, setFrequency] = useState<RRuleFrequency | 'CUSTOM'>(RRuleFrequency.DAILY);
  const [recurrenceEnds, setRecurrenceEnds] = useState('never');

  const [customFrequency, setCustomFrequency] = useState<CustomFrequencyState>({
    freq: RRuleFrequency.DAILY,
    interval: 1,
    byweekday: [],
    bymonthday: [],
    bymonth: [],
  });

  const [recurrenceEndDate, setRecurrenceEndDate] = useState(endDate);
  const [occurrences, setOccurrrences] = useState(1);

  useEffect(() => {
    if (initialState && !hasInitialized) {
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
    setHasInitialized(true);
  }, [initialState, hasInitialized]);

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
              date: i18nShortDate(startDate),
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
          byweekday: [isoWeekdayToRRule[startDate.isoWeekday()]],
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
  }, [startDate]);

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
      return { ...customFrequency, ...recurrenceEndProps };
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
    <EuiPanel hasShadow={false} hasBorder={true} paddingSize="none">
      <div style={{ padding: '16px', backgroundColor: '#f8fafd' }}>
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
          />
        </EuiFormRow>
        {frequency === 'CUSTOM' && (
          <CustomRecurrenceScheduler
            startDate={startDate}
            onChange={setCustomFrequency}
            initialState={customFrequency}
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
            isFullWidth
            type="single"
            legend="Recurrence ends"
            idSelected={recurrenceEnds}
            onChange={setRecurrenceEnds}
            options={[
              { id: 'never', label: 'Never' },
              { id: 'ondate', label: 'On date' },
              { id: 'afterx', label: 'After {x}' },
            ]}
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
              <EuiFieldNumber
                min={1}
                value={occurrences}
                onChange={(e) => setOccurrrences(Number(e.target.value))}
              />
            </EuiFormControlLayout>
          </EuiFormRow>
        )}
      </div>
      <EuiHorizontalRule margin="none" />
      <div style={{ padding: '16px' }}>
        {i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.repeatsSummary', {
          defaultMessage: 'Repeats {summary}',
          values: { summary: recurrenceSummary(compiledRecurrenceSchedule) },
        })}
      </div>
    </EuiPanel>
  );
};

interface CustomRecurrenceSchedulerProps {
  startDate: Moment | null;
  onChange: (state: CustomFrequencyState) => void;
  initialState: CustomFrequencyState;
}

const CustomRecurrenceScheduler: React.FC<CustomRecurrenceSchedulerProps> = ({
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

  const { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth } = useMemo(
    () =>
      startDate
        ? getWeekdayInfo(startDate)
        : { dayOfWeek: null, nthWeekdayOfMonth: null, isLastOfMonth: false },
    [startDate]
  );

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
            .map((n) => isoWeekdayToRRule[Number(n)])
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

  return (
    <>
      <EuiFormRow style={{ alignItems: 'center' }} fullWidth label=" ">
        <EuiFormControlLayoutDelimited
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
              options={[
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
              ]}
            />
          }
        />
      </EuiFormRow>
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
            isFullWidth
            type="single"
            legend="Repeat on weekday or month day"
            idSelected={monthlyRecurDay}
            onChange={setMonthlyRecurDay}
            options={[
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
            ]}
          />
        </EuiFormRow>
      )}
    </>
  );
};

export const recurrenceSummary = ({
  freq,
  interval,
  until,
  count,
  byweekday,
  bymonthday,
  bymonth,
}: RecurrenceSchedule) => {
  const frequencySummary = i18nFreqSummary(interval)[freq];

  // For weekday summaries
  const firstWeekday = byweekday ? byweekday[0] : '';
  const nthWeekday = !firstWeekday
    ? null
    : firstWeekday.startsWith('+')
    ? Number(firstWeekday[1])
    : firstWeekday.startsWith('-1')
    ? 0
    : null;
  let byweekdaySummary =
    byweekday && byweekday.length > 0
      ? nthWeekday !== null
        ? i18nNthWeekdayShort(rRuleWeekdayToWeekdayName(firstWeekday))[nthWeekday]
        : i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.byweekdaySummary', {
            defaultMessage: 'on {weekdays}',
            values: {
              weekdays: byweekday
                .map((rRuleWeekday) => rRuleWeekdayToWeekdayName(rRuleWeekday))
                .join(', '),
            },
          })
      : null;
  if (byweekdaySummary)
    byweekdaySummary = byweekdaySummary[0].toLocaleLowerCase() + byweekdaySummary.slice(1);

  const bymonthdaySummary =
    bymonthday && bymonthday.length > 0
      ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.bymonthdaySummary', {
          defaultMessage: 'on day {monthday}',
          values: {
            monthday: bymonthday.join(', '),
          },
        })
      : null;

  const bymonthSummary =
    bymonth && bymonth.length > 0 && bymonthday && bymonthday.length > 0
      ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.bymonthSummary', {
          defaultMessage: 'on {date}',
          values: {
            date: i18nShortDate(
              moment()
                .month(bymonth[0] - 1)
                .date(bymonthday[0])
            ),
          },
        })
      : null;

  const onSummary =
    freq === RRuleFrequency.WEEKLY
      ? byweekdaySummary
      : freq === RRuleFrequency.MONTHLY
      ? byweekdaySummary ?? bymonthdaySummary
      : freq === RRuleFrequency.YEARLY
      ? bymonthSummary
      : null;

  const untilSummary = until
    ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.untilDateSummary', {
        defaultMessage: 'until {date}',
        values: { date: moment(until).format('LL') },
      })
    : count
    ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.occurrencesSummary', {
        defaultMessage: 'for {count, plural, one {# occurrence} other {# occurrences}}',
        values: { count },
      })
    : null;

  const every = i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurrenceSummary', {
    defaultMessage: 'every {frequencySummary}{on}{until}',
    values: {
      frequencySummary,
      on: onSummary ? ` ${onSummary}` : '',
      until: untilSummary ? ` ${untilSummary}` : '',
    },
  });

  return every;
};

const i18nShortDate = (date: Moment) =>
  date
    .format('LL')
    // We want to produce the local equivalent of DD MMM (e.g. MMM DD in most non-US countries)
    // but Moment doesn't let us format just DD MMM according to locale, only DD MM(,?) YYYY,
    // so regex replace the year and any commas from the LL formatted string
    .replace(new RegExp(`(${date.format('YYYY')}|,)`, 'g'), '')
    .trim();

const i18nFreqSummary = (interval: number) => ({
  [RRuleFrequency.DAILY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurDaySummary',
    {
      defaultMessage: '{interval, plural, one {day} other {# days}}',
      values: { interval },
    }
  ),
  [RRuleFrequency.WEEKLY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeekSummary',
    {
      defaultMessage: '{interval, plural, one {week} other {# weeks}}',
      values: { interval },
    }
  ),
  [RRuleFrequency.MONTHLY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurMonthSummary',
    {
      defaultMessage: '{interval, plural, one {month} other {# months}}',
      values: { interval },
    }
  ),
  [RRuleFrequency.YEARLY]: i18n.translate(
    'xpack.triggersActionsUI.ruleSnoozeScheduler.recurYearSummary',
    {
      defaultMessage: '{interval, plural, one {year} other {# years}}',
      values: { interval },
    }
  ),
});

const getWeekdayInfo = (date: Moment) => {
  const dayOfWeek = date.format('dddd');
  const nthWeekdayOfMonth = Math.ceil(date.date() / 7);
  const isLastOfMonth = nthWeekdayOfMonth > 4 || !date.isSame(moment(date).add(7, 'd'), 'month');
  return { dayOfWeek, nthWeekdayOfMonth, isLastOfMonth };
};

const getInitialByweekday = (
  initialStateByweekday: CustomFrequencyState['byweekday'],
  date: Moment | null
) => {
  const dayOfWeek = date ? date.isoWeekday() : 1;
  return ISO_WEEKDAYS.reduce(
    (result, n) => ({
      ...result,
      [n]:
        initialStateByweekday.length > 0
          ? initialStateByweekday
              // Sanitize nth day strings, e.g. +2MO, -1FR, into just days of the week
              .map((w) => w.replace(/[0-9+\-]/g, ''))
              .includes(isoWeekdayToRRule[n])
          : n === dayOfWeek,
    }),
    {} as Record<string, boolean>
  );
};

const generateNthByweekday = (startDate: Moment) => {
  const { isLastOfMonth, nthWeekdayOfMonth } = getWeekdayInfo(startDate);
  return [
    `${isLastOfMonth ? '-1' : '+' + nthWeekdayOfMonth}${isoWeekdayToRRule[startDate.isoWeekday()]}`,
  ];
};

const I18N_WEEKDAY_OPTIONS = ISO_WEEKDAYS.map((n) => ({
  id: String(n),
  label: moment().isoWeekday(n).format('dd'),
}));

const i18nNthWeekday = (dayOfWeek: string) => [
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurLast', {
    defaultMessage: 'Monthly on the last {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFirst', {
    defaultMessage: 'Monthly on the first {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurSecond', {
    defaultMessage: 'Monthly on the second {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurThird', {
    defaultMessage: 'Monthly on the third {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFourth', {
    defaultMessage: 'Monthly on the fourth {dayOfWeek}',
    values: { dayOfWeek },
  }),
];

const i18nNthWeekdayShort = (dayOfWeek: string) => [
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurLastShort', {
    defaultMessage: 'On the last {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFirstShort', {
    defaultMessage: 'On the 1st {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurSecondShort', {
    defaultMessage: 'On the 2nd {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurThirdShort', {
    defaultMessage: 'On the 3rd {dayOfWeek}',
    values: { dayOfWeek },
  }),
  i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurFourthShort', {
    defaultMessage: 'On the 4th {dayOfWeek}',
    values: { dayOfWeek },
  }),
];

const DEFAULT_REPEAT_OPTIONS = [
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurDaily', {
      defaultMessage: 'Daily',
    }),
    value: RRuleFrequency.DAILY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurWeekly', {
      defaultMessage: 'Weekly',
    }),
    value: RRuleFrequency.WEEKLY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurMonthly', {
      defaultMessage: 'Monthly',
    }),
    value: RRuleFrequency.MONTHLY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurYearly', {
      defaultMessage: 'Yearly',
    }),
    value: RRuleFrequency.YEARLY,
  },
  {
    text: i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.recurCustom', {
      defaultMessage: 'Custom',
    }),
    value: 'CUSTOM',
  },
];

const DEFAULT_RRULE_PRESETS = {
  [RRuleFrequency.DAILY]: {
    interval: 1,
  },
  [RRuleFrequency.WEEKLY]: {
    interval: 1,
  },
  [RRuleFrequency.MONTHLY]: {
    interval: 1,
  },
  [RRuleFrequency.YEARLY]: {
    interval: 1,
  },
};

const isoWeekdayToRRule: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

const rRuleWeekdayToIsoWeekday = mapValues(invert(isoWeekdayToRRule), (v) => Number(v));

const rRuleWeekdayToWeekdayName = (weekday: string) =>
  moment().isoWeekday(rRuleWeekdayToIsoWeekday[weekday.slice(-2)]).format('dddd');
