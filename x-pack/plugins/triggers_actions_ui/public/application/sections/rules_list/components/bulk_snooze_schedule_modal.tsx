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
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiButtonEmpty,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import {
  withBulkRuleOperations,
  ComponentOpts as BulkOperationsComponentOpts,
} from '../../common/components/with_bulk_rule_api_operations';
import { RuleSnoozeScheduler } from './rule_snooze/scheduler';
import { RuleTableItem, SnoozeSchedule } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';

export type BulkSnoozeScheduleModalProps = {
  rulesToSchedule: RuleTableItem[];
  rulesToScheduleFilter?: string;
  numberOfSelectedRules?: number;
  onClose: () => void;
  onSave: () => void;
} & BulkOperationsComponentOpts;

export const BulkSnoozeScheduleModal = (props: BulkSnoozeScheduleModalProps) => {
  const {
    rulesToSchedule,
    rulesToScheduleFilter,
    // numberOfSelectedRules,
    onClose,
    onSave,
    bulkSnoozeRules,
    bulkUnsnoozeRules,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const isScheduleModalOpen = useMemo(() => {
    if (rulesToScheduleFilter) {
      return true;
    }
    return rulesToSchedule.length > 0;
  }, [rulesToSchedule, rulesToScheduleFilter]);

  const onAddSnoozeSchedule = async (schedule: SnoozeSchedule) => {
    onClose();
    await bulkSnoozeRules({
      ids: rulesToSchedule.map((item) => item.id),
      filter: rulesToScheduleFilter,
      snoozeSchedule: schedule,
    });
    toasts.addSuccess('Rules successfully snoozed.');
    onSave();
  };

  const onRemoveSnoozeSchedule = async () => {
    onClose();
    await bulkUnsnoozeRules({
      ids: rulesToSchedule.map((item) => item.id),
      filter: rulesToScheduleFilter,
    });
    toasts.addSuccess('Rule schedules successfully unsnoozed.');
    onSave();
  };

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
            onSaveSchedule={onAddSnoozeSchedule}
            onCancelSchedules={onRemoveSnoozeSchedule}
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

export const BulkSnoozeScheduleModalWithApi = withBulkRuleOperations(BulkSnoozeScheduleModal);
