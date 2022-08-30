/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiButtonEmpty,
  EuiConfirmModal,
} from '@elastic/eui';
import {
  withBulkRuleOperations,
  ComponentOpts as BulkOperationsComponentOpts,
} from '../../common/components/with_bulk_rule_api_operations';
import { RuleTableItem, SnoozeSchedule } from '../../../../types';
import { SnoozePanel, futureTimeToInterval } from './rule_snooze';
import { RuleSnoozeScheduler } from './rule_snooze/scheduler';
import { isRuleSnoozed } from '../../../lib';
import { useKibana } from '../../../../common/lib/kibana';

export type BulkSnoozeModalProps = {
  rulesToSnooze: RuleTableItem[];
  rulesToSchedule: RuleTableItem[];
  onClose: () => void;
  onSave: () => void;
} & BulkOperationsComponentOpts;

export const BulkSnoozeModal = (props: BulkSnoozeModalProps) => {
  const { rulesToSnooze, rulesToSchedule, onClose, onSave, snoozeRules, unsnoozeRules } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const isSnoozeModalOpen = useMemo(() => {
    return rulesToSnooze.length > 0;
  }, [rulesToSnooze]);

  const isScheduleModalOpen = useMemo(() => {
    return rulesToSchedule.length > 0;
  }, [rulesToSchedule]);

  const interval = useMemo(() => {
    const rule = rulesToSnooze.find((item) => item.isSnoozedUntil);
    if (rule) {
      return futureTimeToInterval(rule.isSnoozedUntil);
    }
  }, [rulesToSnooze]);

  const isSnoozed = useMemo(() => {
    return rulesToSnooze.some((item) => isRuleSnoozed(item));
  }, [rulesToSnooze]);

  const hasSchedule = useMemo(() => {
    return rulesToSchedule.some((item) => !!item.snoozeSchedule?.length);
  }, [rulesToSchedule]);

  const schedulesToDelete = useMemo(() => {
    const scheduleIds: string[] = [];
    rulesToSchedule.forEach((rule) => {
      if (rule.snoozeSchedule) {
        rule.snoozeSchedule.forEach((schedule) => {
          if (schedule.id) {
            scheduleIds.push(schedule.id);
          }
        });
      }
    });
    return [...new Set(scheduleIds)];
  }, [rulesToSchedule]);

  const handleSnoozeRule = async (schedule: SnoozeSchedule) => {
    onClose();
    await snoozeRules(isSnoozeModalOpen ? rulesToSnooze : rulesToSchedule, schedule);
    toasts.addSuccess('Rules successfully snoozed.');
    onSave();
  };

  const handleUnsnoozeRule = async (scheduleIds?: string[]) => {
    onClose();
    await unsnoozeRules(isSnoozeModalOpen ? rulesToSnooze : rulesToSchedule, scheduleIds);
    toasts.addSuccess('Rules successfully unsnoozed.');
    onSave();
  };

  const handleRemoveSnoozeSchedule = async () => {
    onClose();
    await unsnoozeRules(isSnoozeModalOpen ? rulesToSnooze : rulesToSchedule, schedulesToDelete);
    toasts.addSuccess('Rule schedules successfully unsnoozed.');
    onSave();
  };

  if (!isSnoozeModalOpen && !isScheduleModalOpen) {
    return null;
  }

  if (isSnoozeModalOpen && isSnoozed) {
    return (
      <EuiConfirmModal
        title="Unsnooze Rules"
        onCancel={onClose}
        onConfirm={() => handleUnsnoozeRule()}
        cancelButtonText="No, don't do it"
        confirmButtonText="Yes, do it"
        buttonColor="danger"
      >
        <p>Unsnooze all selected rules?</p>
      </EuiConfirmModal>
    );
  }

  if (isSnoozeModalOpen) {
    return (
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            Snooze Notifications
            <EuiSpacer size="s" />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <SnoozePanel
            interval={interval}
            snoozeRule={handleSnoozeRule}
            unsnoozeRule={handleUnsnoozeRule}
            showAddSchedule={false}
            showCancel={isSnoozed}
            scheduledSnoozes={[]}
            activeSnoozes={[]}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  if (isScheduleModalOpen && hasSchedule) {
    return (
      <EuiConfirmModal
        title="Remove Snooze Schedule"
        onCancel={onClose}
        onConfirm={() => handleRemoveSnoozeSchedule()}
        cancelButtonText="No, don't do it"
        confirmButtonText="Yes, do it"
        buttonColor="danger"
      >
        <p>Remove all snooze schedules from selected rules?</p>
      </EuiConfirmModal>
    );
  }

  if (isScheduleModalOpen) {
    return (
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            Add Snooze Schedule
            <EuiSpacer size="s" />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <RuleSnoozeScheduler
            hasTitle={false}
            isLoading={false}
            initialSchedule={null}
            onSaveSchedule={handleSnoozeRule}
            onCancelSchedules={handleUnsnoozeRule}
            onClose={() => {}}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  return null;
};

export const BulkSnoozeModalWithApi = withBulkRuleOperations(BulkSnoozeModal);
