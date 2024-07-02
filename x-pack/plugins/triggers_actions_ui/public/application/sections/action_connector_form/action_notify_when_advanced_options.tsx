/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import { RuleAction } from '@kbn/alerting-types';
import React, { useEffect, useMemo, useState } from 'react';
import { TIMEZONE_OPTIONS as UI_TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import moment, { Moment } from 'moment';
import { Frequency, RRule, WeekdayStr } from 'rrule';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { RRULE_DAY_NAMES } from '../../constants';

interface ActionNotifyWhenAdvancedOptionsProps {
  frequency: RuleAction['frequency'];
  throttle: number | null;
  throttleUnit: string;
  onDtStartChange: (dtstart?: string) => void;
  onTzidChange: (tzid?: string) => void;
  onByWeekdayChange: (byweekday?: WeekdayStr[]) => void;
  isOpen: boolean;
}

const useDefaultTimezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') return moment.tz?.guess() ?? 'UTC';
  return kibanaTz;
};

export const ActionNotifyWhenAdvancedOptions = ({
  frequency,
  throttle,
  throttleUnit,
  onTzidChange,
  onDtStartChange,
  onByWeekdayChange,
  isOpen,
}: ActionNotifyWhenAdvancedOptionsProps) => {
  const defaultTz = useDefaultTimezone();
  const defaultStartDate = moment().toISOString();
  const defaultWeekdays: WeekdayStr[] = useMemo(
    () => ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
    []
  );

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(isOpen);
  const [selectedTimezoneOptions, setSelectedTimezoneOptions] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >();
  const [selectedByWeekdayOptions, setSelectedByWeekdayOptions] = useState<
    Array<EuiComboBoxOptionOption<WeekdayStr>> | undefined
  >();
  const [selectedStartDate, setSelectedStartDate] = useState<Moment | undefined>();

  const TIMEZONE_OPTIONS = UI_TIMEZONE_OPTIONS.map((n) => ({ label: n }));
  const BY_WEEKDAY_OPTIONS = defaultWeekdays.map((n) => ({ label: n }));

  useEffect(() => {
    setSelectedTimezoneOptions(frequency?.tzid ? [{ label: frequency.tzid }] : undefined);
    setSelectedStartDate(
      frequency?.dtstart && frequency?.tzid
        ? moment(frequency.dtstart).tz(frequency.tzid)
        : undefined
    );
    setSelectedByWeekdayOptions(
      frequency?.byweekday
        ? frequency.byweekday.map((day) => ({ label: RRULE_DAY_NAMES[day], value: day }))
        : undefined
    );
  }, [frequency]);

  useEffect(() => {
    if (showAdvancedOptions) {
      if (!frequency?.tzid) {
        onTzidChange(defaultTz);
      }
      if (!frequency?.dtstart) {
        onDtStartChange(defaultStartDate);
      }
      if (!frequency?.byweekday) {
        onByWeekdayChange(defaultWeekdays);
      }
    }
  });

  useEffect(() => {
    if (!showAdvancedOptions) {
      onTzidChange(undefined);
      onDtStartChange(undefined);
      onByWeekdayChange(undefined);
    }
  }, [showAdvancedOptions, onTzidChange, onDtStartChange, onByWeekdayChange]);

  const nextRun = useMemo(() => {
    if (frequency?.tzid && frequency?.dtstart && frequency?.byweekday) {
      const throttleUnitToFreq: { [key: string]: number } = {
        s: Frequency.SECONDLY,
        m: Frequency.MINUTELY,
        h: Frequency.HOURLY,
        d: Frequency.DAILY,
      };
      const _rrule = new RRule({
        freq: throttleUnitToFreq[throttleUnit] || Frequency.HOURLY,
        interval: throttle || 1,
        tzid: frequency.tzid,
        dtstart: moment(frequency.dtstart).tz(frequency.tzid).toDate(),
        byweekday: frequency.byweekday,
      });

      return (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="timeslider">
            {_rrule.after(moment().tz(frequency.tzid).toDate())?.toString()}
          </EuiBadge>
        </EuiFlexItem>
      );
    }
    return <></>;
  }, [frequency?.dtstart, frequency?.tzid, frequency?.byweekday, throttle, throttleUnit]);

  return (
    <EuiFormRow fullWidth>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem style={{ flexGrow: 0.1 }} />
        <EuiFlexItem grow={4}>
          <EuiFormRow fullWidth>
            <EuiSwitch
              label="Show advanced options"
              checked={showAdvancedOptions}
              onChange={(e) => setShowAdvancedOptions(e.target.checked)}
            />
          </EuiFormRow>
          {showAdvancedOptions ? (
            <>
              <EuiFormRow fullWidth>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={3}>
                    <EuiFormControlLayout prepend="Start at">
                      <EuiDatePicker
                        showTimeSelect
                        selected={selectedStartDate}
                        onChange={(date) => {
                          onDtStartChange(date ? date.toISOString() : undefined);
                        }}
                        timeIntervals={5}
                        timeFormat="HH:mm"
                      />
                    </EuiFormControlLayout>
                  </EuiFlexItem>
                  <EuiFlexItem grow={2}>
                    <EuiComboBox<string>
                      singleSelection={{ asPlainText: true }}
                      options={TIMEZONE_OPTIONS}
                      selectedOptions={selectedTimezoneOptions}
                      onChange={(timezones) => {
                        onTzidChange(timezones[0].label);
                      }}
                      data-test-subj="rrule_byweekday"
                      isClearable={false}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                isInvalid={(selectedByWeekdayOptions || []).length <= 0}
                error="At least one day must be selected"
              >
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={5}>
                    <EuiComboBox<WeekdayStr>
                      fullWidth
                      options={BY_WEEKDAY_OPTIONS}
                      selectedOptions={selectedByWeekdayOptions}
                      onChange={(weekdayOptions) => {
                        onByWeekdayChange(weekdayOptions.map((opt) => opt.value!));
                      }}
                      isClearable={true}
                      data-test-subj="rrule_byweekday"
                      isInvalid={(selectedByWeekdayOptions || []).length <= 0}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
              <EuiFormRow fullWidth label="Preview next run">
                <EuiFlexGroup gutterSize="s">{nextRun}</EuiFlexGroup>
              </EuiFormRow>
            </>
          ) : (
            <></>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
