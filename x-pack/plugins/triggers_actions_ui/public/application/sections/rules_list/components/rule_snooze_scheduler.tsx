/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid';
import {
  EuiDatePicker,
  EuiDatePickerRange,
  EuiPanel,
  EuiContextMenuPanel,
  EuiComboBox,
  EuiFormRow,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { RecurrenceSchedule, SnoozeSchedule } from '../../../../types';
import { RecurrenceScheduler } from './recurrence_scheduler';

import './rule_snooze_scheduler.scss';

export interface ComponentOpts {
  onClose: () => void;
  onSaveSchedule: (sched: SnoozeSchedule) => void;
}

const TIMEZONE_OPTIONS = moment.tz.names().map((n) => ({ label: n }));

export const RuleSnoozeScheduler: React.FunctionComponent<ComponentOpts> = ({
  onClose,
  onSaveSchedule,
}: ComponentOpts) => {
  // We have to use refs for these things because setting state in an onFocus call re-renders and then blurs an EuiDatePicker input field

  return (
    <EuiContextMenuPanel title="Add schedule" onClose={onClose}>
      <RuleSnoozeSchedulerPanel onSaveSchedule={onSaveSchedule} />
    </EuiContextMenuPanel>
  );
};

interface PanelOpts {
  onSaveSchedule: (sched: SnoozeSchedule) => void;
}
const RuleSnoozeSchedulerPanel: React.FunctionComponent<PanelOpts> = ({ onSaveSchedule }) => {
  // These two states form a state machine for whether or not the user's clicks on the datepicker apply to the start/end date or start/end time
  // - State A: After the user clicks a start date:
  //    - Next date click will change the end date and move to state B
  //    - Time clicks change the start time, and continue to change the start time until the user clicks an end date
  // - State B: After the user clicks an end date:
  //    - Next date click will change the start date and move to state A
  //    - Time clicks change the end time, and continue to change the end time until the user clicks a start date
  // - State C: If the user clicks on the Start Date textbox:
  //    - Next date click will change the start date and move to state B
  //    - Time clicks change the start time, and continue to change the start time
  // - State D: If the user clicks on the End Date textbox:
  //    - Next date click will change the end date and move to state A
  //    - Time clicks change the end time, and continue to change the end time
  // Component initializes in State C
  const [selectingEndDate, setSelectingEndDate] = useState(false);
  const [selectingEndTime, setSelectingEndTime] = useState(false);

  const [startDT, setStartDT] = useState<Moment | null>(null);
  const [endDT, setEndDT] = useState<Moment | null>(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceSchedule, setRecurrenceSchedule] = useState<RecurrenceSchedule | null>(null);

  const [selectedTimezone, setSelectedTimezone] = useState([{ label: moment.tz.guess() }]);

  const minDate = moment();

  const onFocusStart = useCallback(() => {
    setSelectingEndDate(false);
    setSelectingEndTime(false);
  }, [setSelectingEndDate]);

  const onFocusEnd = useCallback(() => {
    setSelectingEndDate(true);
    setSelectingEndTime(true);
  }, [setSelectingEndDate]);

  const selectStartDT = useCallback(
    (date, clearEndDT) => {
      setStartDT(moment.max(date, minDate));
      if (clearEndDT) {
        setEndDT(null);
        setSelectingEndDate(true);
        setSelectingEndTime(false);
      }
    },
    [setStartDT, setSelectingEndDate, minDate]
  );
  const selectEndDT = useCallback(
    (date) => {
      setEndDT(date);
      setSelectingEndTime(true);
      setSelectingEndDate(false);
    },
    [setEndDT, setSelectingEndDate]
  );

  const onSelectFromInline = useCallback(
    (date) => {
      const dateAsMoment = moment(date);
      const newDateAfterStart = !startDT || dateAsMoment.isAfter(startDT);
      const isEndDateTimeChange =
        dateAsMoment.isSame(endDT, 'day') && !dateAsMoment.isSame(endDT, 'minute');
      const isStartDateTimeChange =
        dateAsMoment.isSame(startDT, 'day') && !dateAsMoment.isSame(startDT, 'minute');

      const applyToEndDate =
        !isStartDateTimeChange && (selectingEndDate || (isEndDateTimeChange && selectingEndTime));
      if (applyToEndDate && newDateAfterStart) {
        selectEndDT(date);
      } else selectStartDT(date, !isStartDateTimeChange);
    },
    [selectingEndDate, selectingEndTime, startDT, endDT, selectEndDT, selectStartDT]
  );

  const onClickSaveSchedule = useCallback(() => {
    if (!startDT || !endDT) return;
    const recurrence =
      isRecurring && recurrenceSchedule
        ? recurrenceSchedule
        : {
            count: 1,
          };
    onSaveSchedule({
      id: uuid.v4(),
      rRule: {
        dtstart: startDT.toISOString(),
        tzid: selectedTimezone[0].label ?? moment.tz.guess(),
        ...recurrence,
      },
      duration: endDT.valueOf() - startDT.valueOf(),
    });
  }, [onSaveSchedule, endDT, startDT, selectedTimezone, isRecurring, recurrenceSchedule]);

  return (
    <EuiPanel paddingSize="s" hasShadow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" direction="column">
        <EuiFlexItem>
          <EuiDatePickerRange
            startDateControl={
              <EuiDatePicker
                calendarClassName="hidden"
                preventOpenOnFocus
                showTimeSelect
                onFocus={onFocusStart}
                selected={startDT}
                onChange={setStartDT}
                minDate={minDate}
              />
            }
            endDateControl={
              <EuiDatePicker
                calendarClassName="hidden"
                preventOpenOnFocus
                showTimeSelect
                className={selectingEndDate && !endDT ? 'RuleSnoozeScheduler__pseudofocus' : ''}
                onFocus={onFocusEnd}
                selected={endDT}
                onChange={setEndDT}
                minDate={startDT ?? minDate}
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel
            paddingSize="none"
            hasShadow={false}
            hasBorder={true}
            style={{ width: '400px' }}
          >
            <EuiPanel paddingSize="s" hasShadow={false}>
              <EuiDatePicker
                inline
                showTimeSelect
                shadow={false}
                startDate={startDT}
                endDate={endDT}
                selected={selectingEndTime ? endDT : startDT}
                onSelect={onSelectFromInline}
                minDate={minDate}
                adjustDateOnChange={false}
              />
            </EuiPanel>
            <EuiHorizontalRule margin="none" />
            <EuiPanel paddingSize="m" hasShadow={false}>
              <EuiFormRow
                display="columnCompressed"
                style={{ alignItems: 'center' }}
                fullWidth
                label={i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.timezoneLabel', {
                  defaultMessage: 'Timezone',
                })}
              >
                <EuiComboBox
                  singleSelection={{ asPlainText: true }}
                  options={TIMEZONE_OPTIONS}
                  selectedOptions={selectedTimezone}
                  onChange={setSelectedTimezone}
                  isClearable={false}
                />
              </EuiFormRow>
            </EuiPanel>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.triggersActionsUi.ruleSnoozeScheduler.reucrringSwitch', {
          defaultMessage: 'Make recurring',
        })}
        onChange={() => setIsRecurring(!isRecurring)}
        checked={isRecurring}
      />
      {isRecurring && (
        <>
          <EuiSpacer size="s" />
          <RecurrenceScheduler
            startDate={startDT}
            endDate={endDT}
            onChange={setRecurrenceSchedule}
            initialState={recurrenceSchedule}
          />
        </>
      )}
      <EuiHorizontalRule margin="m" />
      <EuiButton fill fullWidth disabled={!startDT || !endDT} onClick={onClickSaveSchedule}>
        {i18n.translate('xpack.triggersActionsUi.ruleSnoozeScheduler.saveSchedule', {
          defaultMessage: 'Save schedule',
        })}
      </EuiButton>
    </EuiPanel>
  );
};
