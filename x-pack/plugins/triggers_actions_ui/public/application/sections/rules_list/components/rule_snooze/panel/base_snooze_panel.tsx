/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { RuleSnooze } from '@kbn/alerting-plugin/common';
import moment from 'moment';
import React, { useState, useCallback, useMemo } from 'react';
import { parseInterval } from '../../../../../../../common';

import { SnoozeSchedule } from '../../../../../../types';
import { COMMON_SNOOZE_TIMES, SnoozeUnit } from './constants';
import { durationToTextString, scheduleSummary, usePreviousSnoozeInterval } from './helpers';
import { DAYS, HOURS, MINUTES, MONTHS, WEEKS } from './translations';

export interface BaseSnoozePanelProps {
  interval?: string;
  snoozeRule: (schedule: SnoozeSchedule) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  showCancel: boolean;
  scheduledSnoozes: RuleSnooze;
  hasTitle?: boolean;
  navigateToScheduler: (sched?: SnoozeSchedule) => void;
  isLoading: boolean;
  onRemoveAllSchedules: (ids: string[]) => void;
  inPopover?: boolean;
}

export const BaseSnoozePanel: React.FunctionComponent<BaseSnoozePanelProps> = ({
  isLoading,
  interval = '3d',
  snoozeRule,
  unsnoozeRule,
  showCancel,
  scheduledSnoozes,
  navigateToScheduler,
  onRemoveAllSchedules,
  hasTitle,
  inPopover = false,
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
        if (intervalToStore.startsWith('-')) throw new Error('Cannot store a negative interval');
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
            flush="left"
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
        <EuiPopoverTitle data-test-subj="snoozePanelTitle">
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
            minWidth={0}
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
            <EuiLink
              data-test-subj={`linkSnooze${value}${unit}`}
              onClick={() => applySnooze(value, unit)}
            >
              {durationToTextString(value, unit)}
            </EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            size="s"
            onClick={onApplyIndefinite}
            data-test-subj="ruleSnoozeIndefiniteApply"
          >
            {i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozeIndefinitely', {
              defaultMessage: 'Snooze indefinitely',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {!hasSchedules && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiButton
                fill
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
                data-test-subj="ruleRemoveAllSchedules"
              >
                {i18n.translate('xpack.triggersActionsUI.sections.rulesList.removeAllButton', {
                  defaultMessage: 'Remove all',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj="ruleSchedulesList">
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
              <EuiButtonEmpty
                data-test-subj="ruleSchedulesListAddButton"
                iconType="plusInCircleFilled"
                onClick={onClickAddSchedule}
              >
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
          {!inPopover && <EuiSpacer size="s" />}
          <EuiPopoverFooter>
            {!inPopover && <EuiSpacer size="s" />}
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
          </EuiPopoverFooter>
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
