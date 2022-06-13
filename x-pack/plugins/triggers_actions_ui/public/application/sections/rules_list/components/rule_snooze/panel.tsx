/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import moment from 'moment';
import { RuleSnooze } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  useGeneratedHtmlId,
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
  EuiButtonEmpty,
  EuiIcon,
  EuiConfirmModal,
  EuiPopoverTitle,
} from '@elastic/eui';
import { parseInterval } from '../../../../../../common';
import type { RecurrenceSchedule, SnoozeSchedule } from '../../../../../types';
import { RuleSnoozeScheduler } from './scheduler';
import { recurrenceSummary } from './recurrence_scheduler/helpers';

export type SnoozeUnit = 'm' | 'h' | 'd' | 'w' | 'M';
const COMMON_SNOOZE_TIMES: Array<[number, SnoozeUnit]> = [
  [1, 'h'],
  [3, 'h'],
  [8, 'h'],
  [1, 'd'],
];

interface SnoozePanelProps {
  interval?: string;
  snoozeRule: (schedule: SnoozeSchedule) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  showCancel: boolean;
  scheduledSnoozes: RuleSnooze;
  hasTitle?: boolean;
}

interface BaseSnoozePanelProps extends SnoozePanelProps {
  navigateToScheduler: (sched?: SnoozeSchedule) => void;
  isLoading: boolean;
  onRemoveAllSchedules: (ids: string[]) => void;
}

export const SnoozePanel: React.FC<SnoozePanelProps> = ({
  interval,
  snoozeRule,
  unsnoozeRule,
  showCancel,
  scheduledSnoozes,
  hasTitle = true,
}) => {
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [initialSchedule, setInitialSchedule] = useState<SnoozeSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSnoozeRule = useCallback(
    async (schedule: SnoozeSchedule) => {
      setIsLoading(true);
      try {
        await snoozeRule(schedule);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, snoozeRule]
  );

  const onUnsnoozeRule = useCallback(
    async (scheduleIds?: string[]) => {
      setIsLoading(true);
      try {
        await unsnoozeRule(scheduleIds);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, unsnoozeRule]
  );

  const saveSnoozeSchedule = useCallback(
    async (schedule: SnoozeSchedule) => {
      setIsLoading(true);
      try {
        await snoozeRule(schedule);
      } finally {
        setIsLoading(false);
      }
    },
    [snoozeRule, setIsLoading]
  );

  const cancelSnoozeSchedules = useCallback(
    async (scheduleIds: string[]) => {
      setIsLoading(true);
      try {
        await unsnoozeRule(scheduleIds);
      } finally {
        setIsLoading(false);
      }
    },
    [unsnoozeRule, setIsLoading]
  );

  const onOpenScheduler = useCallback(
    (schedule?: SnoozeSchedule) => {
      setInitialSchedule(schedule ?? null);
      setIsSchedulerOpen(true);
    },
    [setInitialSchedule, setIsSchedulerOpen]
  );

  const onCloseScheduler = useCallback(() => setIsSchedulerOpen(false), [setIsSchedulerOpen]);

  return !isSchedulerOpen ? (
    <BaseSnoozePanel
      isLoading={isLoading}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      interval={interval}
      showCancel={showCancel}
      scheduledSnoozes={scheduledSnoozes}
      navigateToScheduler={onOpenScheduler}
      onRemoveAllSchedules={cancelSnoozeSchedules}
      hasTitle={hasTitle}
    />
  ) : (
    <RuleSnoozeScheduler
      isLoading={isLoading}
      initialSchedule={initialSchedule}
      onClose={onCloseScheduler}
      onSaveSchedule={saveSnoozeSchedule}
      onCancelSchedules={cancelSnoozeSchedules}
      hasTitle={hasTitle}
    />
  );
};

const PREV_SNOOZE_INTERVAL_KEY = 'triggersActionsUi_previousSnoozeInterval';
export const usePreviousSnoozeInterval: (
  p?: string | null
) => [string | null, (n: string) => void] = (propsInterval) => {
  const intervalFromStorage = localStorage.getItem(PREV_SNOOZE_INTERVAL_KEY);
  const usePropsInterval = typeof propsInterval !== 'undefined';
  const interval = usePropsInterval ? propsInterval : intervalFromStorage;
  const [previousSnoozeInterval, setPreviousSnoozeInterval] = useState<string | null>(interval);
  const storeAndSetPreviousSnoozeInterval = (newInterval: string) => {
    if (!usePropsInterval) {
      localStorage.setItem(PREV_SNOOZE_INTERVAL_KEY, newInterval);
    }
    setPreviousSnoozeInterval(newInterval);
  };
  return [previousSnoozeInterval, storeAndSetPreviousSnoozeInterval];
};

const BaseSnoozePanel: React.FunctionComponent<BaseSnoozePanelProps> = ({
  isLoading,
  interval = '3d',
  snoozeRule,
  unsnoozeRule,
  showCancel,
  scheduledSnoozes,
  navigateToScheduler,
  onRemoveAllSchedules,
  hasTitle,
}) => {
  const [intervalValue, setIntervalValue] = useState(parseInterval(interval).value);
  const [intervalUnit, setIntervalUnit] = useState(parseInterval(interval).unit);

  const [isRemoveAllModalVisible, setIsRemoveAllModalVisible] = useState(false);

  const [previousSnoozeInterval, setPreviousSnoozeInterval] = usePreviousSnoozeInterval();

  const onChangeValue = useCallback(
    ({ target }) => setIntervalValue(target.value),
    [setIntervalValue]
  );
  const onChangeUnit = useCallback(
    ({ target }) => setIntervalUnit(target.value),
    [setIntervalUnit]
  );

  const snoozeRuleAndStoreInterval = useCallback(
    (newSnoozeEndTime: string | -1, intervalToStore: string | null) => {
      if (intervalToStore) {
        setPreviousSnoozeInterval(intervalToStore);
      }
      const newSnoozeSchedule = {
        id: null,
        duration: newSnoozeEndTime === -1 ? -1 : Date.parse(newSnoozeEndTime) - Date.now(),
        rRule: { dtstart: new Date().toISOString(), count: 1, tzid: moment.tz.guess() },
      };
      return snoozeRule(newSnoozeSchedule);
    },
    [setPreviousSnoozeInterval, snoozeRule]
  );

  const applySnooze = useCallback(
    async (value: number, unit?: SnoozeUnit) => {
      if (value === -1) {
        await snoozeRuleAndStoreInterval(-1, null);
      } else if (value !== 0) {
        const newSnoozeEndTime = moment().add(value, unit).toISOString();
        await snoozeRuleAndStoreInterval(newSnoozeEndTime, `${value}${unit}`);
      } else await unsnoozeRule();
    },
    [snoozeRuleAndStoreInterval, unsnoozeRule]
  );

  const onApplyIndefinite = useCallback(() => applySnooze(-1), [applySnooze]);
  const onClickApplyButton = useCallback(
    () => applySnooze(intervalValue, intervalUnit as SnoozeUnit),
    [applySnooze, intervalValue, intervalUnit]
  );
  const onCancelSnooze = useCallback(() => applySnooze(0, 'm'), [applySnooze]);

  const onClickAddSchedule = useCallback(() => navigateToScheduler(), [navigateToScheduler]);
  const onClickEditScheduleFactory = useCallback(
    (schedule: SnoozeSchedule) => () => navigateToScheduler(schedule),
    [navigateToScheduler]
  );

  const onClickRemoveAllSchedules = useCallback(() => {
    setIsRemoveAllModalVisible(false);
    onRemoveAllSchedules(scheduledSnoozes!.filter((s) => s.id).map((s) => s.id as string));
  }, [onRemoveAllSchedules, scheduledSnoozes]);

  const hasSchedules = useMemo(
    () => scheduledSnoozes && scheduledSnoozes.filter((s) => Boolean(s.id)).length > 0,
    [scheduledSnoozes]
  );

  const parsedPrevSnooze = previousSnoozeInterval ? parseInterval(previousSnoozeInterval) : null;
  const prevSnoozeEqualsCurrentSnooze =
    parsedPrevSnooze?.value === intervalValue && parsedPrevSnooze?.unit === intervalUnit;
  const previousButton = parsedPrevSnooze && !prevSnoozeEqualsCurrentSnooze && (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
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
      {hasTitle && (
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="bellSlash" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozePanelTitle', {
                defaultMessage: 'Snooze notifications',
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup data-test-subj="snoozePanel" gutterSize="xs">
        <EuiFlexItem>
          <EuiFieldNumber
            min={0}
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
          <EuiTitle size="xxxs">
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
      <EuiHorizontalRule margin="s" />
      {!hasSchedules && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiButton
                color="primary"
                onClick={onClickAddSchedule}
                data-test-subj="ruleAddSchedule"
                iconType="calendar"
              >
                {i18n.translate('xpack.triggersActionsUI.sections.rulesList.addSchedule', {
                  defaultMessage: 'Add schedule',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiText textAlign="center" size="xs" color="subdued">
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.rulesList.addScheduleDescription',
                  {
                    defaultMessage:
                      'Create recurring schedules to silence actions during expected downtimes',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {hasSchedules && (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xxxs">
                <h5>
                  {i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.snoozeSchedulesTitle',
                    {
                      defaultMessage: 'Schedules',
                    }
                  )}
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="danger"
                size="xs"
                onClick={() => setIsRemoveAllModalVisible(true)}
              >
                {i18n.translate('xpack.triggersActionsUI.sections.rulesList.removeAllButton', {
                  defaultMessage: 'Remove all',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="xs">
            {scheduledSnoozes!.map((schedule) => (
              <EuiFlexItem key={`snooze-${schedule.id}`}>
                <button
                  style={{ paddingLeft: '9px', paddingRight: '9px' }}
                  className="euiButton euiPanel euiPanel--borderRadiusMedium euiPanel--subdued euiPanel--noShadow euiPanel--noBorder"
                  onClick={onClickEditScheduleFactory(schedule as SnoozeSchedule)}
                >
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="calendar" />
                    </EuiFlexItem>
                    <EuiFlexItem style={{ textAlign: 'left' }}>
                      {scheduleSummary(schedule as SnoozeSchedule)}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="arrowRight" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </button>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onClickAddSchedule}>
                {i18n.translate('xpack.triggersActionsUI.sections.rulesList.addButton', {
                  defaultMessage: 'Add',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
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
                {i18n.translate('xpack.triggersActionsUI.sections.rulesList.cancelSnooze', {
                  defaultMessage: 'Cancel snooze',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="s" />
      {isRemoveAllModalVisible && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.removeAllSnoozeSchedules',
            {
              defaultMessage: 'Remove all schedules',
            }
          )}
          onCancel={() => setIsRemoveAllModalVisible(false)}
          onConfirm={onClickRemoveAllSchedules}
          buttonColor="danger"
          cancelButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.removeCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.removeConfirmButton',
            {
              defaultMessage: 'Remove all',
            }
          )}
        >
          <EuiText>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.removeAllSnoozeSchedulesConfirmText',
              {
                defaultMessage:
                  'This will remove {count, plural, one {# scheduled snooze} other {# scheduled snoozes}} from this rule. Are you sure?',
                values: { count: scheduledSnoozes?.length ?? 0 },
              }
            )}
          </EuiText>
        </EuiConfirmModal>
      )}
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

const scheduleSummary = (schedule: SnoozeSchedule) => {
  if (schedule.rRule.freq == null) return moment(schedule.rRule.dtstart).format('LLLL');
  const summary = recurrenceSummary(schedule.rRule as RecurrenceSchedule);
  // Capitalize first letter of summary
  return summary[0].toLocaleUpperCase() + summary.slice(1);
};

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
export { SnoozePanel as default };
