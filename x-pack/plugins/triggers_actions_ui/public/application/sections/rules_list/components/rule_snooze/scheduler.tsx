/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import {
  EuiDatePicker,
  EuiDatePickerRange,
  EuiComboBox,
  EuiFormRow,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiButton,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiIcon,
  EuiLink,
  EuiSplitPanel,
} from '@elastic/eui';
import { RecurrenceSchedule, SnoozeSchedule } from '../../../../../types';
import { RecurrenceScheduler } from './recurrence_scheduler';

import './scheduler.scss';

interface PanelOpts {
  onSaveSchedule: (sched: SnoozeSchedule) => void;
  onCancelSchedules: (ids: string[]) => void;
  initialSchedule: SnoozeSchedule | null;
  isLoading: boolean;
  bulkSnoozeSchedule?: boolean;
  showDelete?: boolean;
  inPopover?: boolean;
}

export interface ComponentOpts extends PanelOpts {
  onClose: () => void;
  hasTitle: boolean;
}

const TIMEZONE_OPTIONS = moment.tz?.names().map((n) => ({ label: n })) ?? [{ label: 'UTC' }];

const useDefaultTimzezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') return moment.tz?.guess() ?? 'UTC';
  return kibanaTz;
};

export const RuleSnoozeScheduler: React.FunctionComponent<ComponentOpts> = ({
  onClose,
  initialSchedule,
  hasTitle = true,
  ...rest
}: ComponentOpts) => {
  const title =
    hasTitle &&
    (initialSchedule
      ? i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.editSchedule', {
          defaultMessage: 'Edit schedule',
        })
      : i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.addSchedule', {
          defaultMessage: 'Add schedule',
        }));

  return (
    <>
      {title && (
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="arrowLeft" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink color="text" style={{ fontWeight: 'bold' }} onClick={onClose}>
                {title}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
      )}
      <RuleSnoozeSchedulerPanel initialSchedule={initialSchedule} {...rest} />
    </>
  );
};

const RuleSnoozeSchedulerPanel: React.FunctionComponent<PanelOpts> = ({
  onSaveSchedule,
  initialSchedule,
  isLoading,
  onCancelSchedules,
  bulkSnoozeSchedule = false,
  showDelete = false,
  inPopover = false,
}) => {
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
  const minDate = useMemo(
    // If the initial schedule is earlier than now, set minDate to it
    // Set minDate to now if the initial schedule is in the future
    () => moment.min(moment(), moment(initialSchedule?.rRule.dtstart ?? undefined)),
    [initialSchedule]
  );

  const defaultTz = useDefaultTimzezone();
  const initialState = useMemo(() => {
    if (!initialSchedule) {
      return {
        startDT: moment().add('24', 'h'),
        endDT: moment().add('48', 'h'),
        isRecurring: false,
        recurrenceSchedule: null,
        selectedTimezone: [{ label: defaultTz }],
      };
    }

    const isRecurring = initialSchedule?.rRule?.freq != null;

    const recurrenceSchedule = !isRecurring
      ? null
      : ({
          ...initialSchedule.rRule,
          ...(initialSchedule.rRule.until ? { until: moment(initialSchedule.rRule.until) } : {}),
        } as RecurrenceSchedule);

    return {
      startDT: moment(initialSchedule.rRule.dtstart),
      endDT: moment(initialSchedule.rRule.dtstart).add(initialSchedule.duration, 'ms'),
      isRecurring,
      recurrenceSchedule,
      selectedTimezone: [{ label: initialSchedule.rRule.tzid }],
    };
  }, [initialSchedule, defaultTz]);

  const [startDT, setStartDT] = useState<Moment | null>(initialState.startDT);
  const [endDT, setEndDT] = useState<Moment | null>(initialState.endDT);

  const [isRecurring, setIsRecurring] = useState(initialState.isRecurring);
  const [recurrenceSchedule, setRecurrenceSchedule] = useState<RecurrenceSchedule | null>(
    initialState.recurrenceSchedule
  );

  const [selectedTimezone, setSelectedTimezone] = useState(initialState.selectedTimezone);

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
      const newDateAfterStart =
        !startDT || dateAsMoment.isAfter(startDT) || dateAsMoment.isSame(startDT);
      const isEndDateTimeChange =
        dateAsMoment.isSame(endDT, 'day') && !dateAsMoment.isSame(endDT, 'minute');
      const isStartDateTimeChange =
        dateAsMoment.isSame(startDT, 'day') &&
        !dateAsMoment.isSame(startDT, 'minute') &&
        (!isEndDateTimeChange || !selectingEndTime);

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
      id: initialSchedule?.id ?? uuidv4(),
      rRule: {
        dtstart: startDT.toISOString(),
        tzid: selectedTimezone[0].label ?? defaultTz,
        ...recurrence,
      },
      duration: endDT.valueOf() - startDT.valueOf(),
    });
  }, [
    onSaveSchedule,
    endDT,
    startDT,
    selectedTimezone,
    isRecurring,
    recurrenceSchedule,
    initialSchedule,
    defaultTz,
  ]);

  const onCancelSchedule = useCallback(() => {
    if (bulkSnoozeSchedule) {
      onCancelSchedules([]);
    } else if (initialSchedule?.id) {
      onCancelSchedules([initialSchedule.id]);
    }
  }, [initialSchedule, onCancelSchedules, bulkSnoozeSchedule]);

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        direction="column"
        data-test-subj="ruleSnoozeScheduler"
      >
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
                isInvalid={startDT?.isBefore(minDate)}
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
                isInvalid={startDT?.isAfter(endDT)}
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSplitPanel.Outer hasShadow={false} hasBorder={true} style={{ width: '400px' }}>
            <EuiSplitPanel.Inner paddingSize="s">
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
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="m">
              <EuiFormRow
                display="columnCompressed"
                style={{ alignItems: 'center' }}
                fullWidth
                label={i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.timezoneLabel', {
                  defaultMessage: 'Timezone',
                })}
              >
                <EuiComboBox
                  compressed
                  singleSelection={{ asPlainText: true }}
                  options={TIMEZONE_OPTIONS}
                  selectedOptions={selectedTimezone}
                  onChange={setSelectedTimezone}
                  isClearable={false}
                />
              </EuiFormRow>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.reucrringSwitch', {
          defaultMessage: 'Make recurring',
        })}
        onChange={() => setIsRecurring(!isRecurring)}
        checked={isRecurring}
      />
      {isRecurring && (
        <>
          <EuiSpacer size="m" />
          <RecurrenceScheduler
            startDate={startDT}
            endDate={endDT}
            onChange={setRecurrenceSchedule}
            initialState={recurrenceSchedule}
          />
        </>
      )}
      <EuiHorizontalRule margin="m" />
      <EuiButton
        fill
        fullWidth
        disabled={!startDT || !endDT || startDT.isAfter(endDT) || startDT.isBefore(minDate)}
        onClick={onClickSaveSchedule}
        isLoading={isLoading}
        data-test-subj="scheduler-saveSchedule"
      >
        {i18n.translate('xpack.triggersActionsUI.ruleSnoozeScheduler.saveSchedule', {
          defaultMessage: 'Save schedule',
        })}
      </EuiButton>
      {(initialSchedule || showDelete) && (
        <>
          {!inPopover && <EuiSpacer size="s" />}
          <EuiPopoverFooter>
            {!inPopover && <EuiSpacer size="s" />}
            <EuiFlexGroup>
              <EuiFlexItem grow>
                <EuiButton isLoading={isLoading} color="danger" onClick={onCancelSchedule}>
                  {i18n.translate('xpack.triggersActionsUI.sections.rulesList.deleteSchedule', {
                    defaultMessage: 'Delete schedule',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverFooter>
        </>
      )}
    </>
  );
};
