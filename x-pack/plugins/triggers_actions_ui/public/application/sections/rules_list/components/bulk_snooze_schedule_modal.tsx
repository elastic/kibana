/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KueryNode } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import {
  withBulkRuleOperations,
  ComponentOpts as BulkOperationsComponentOpts,
} from '../../common/components/with_bulk_rule_api_operations';
import { RuleSnoozeScheduler } from './rule_snooze/scheduler';
import { RuleTableItem, SnoozeSchedule } from '../../../../types';
import { useBulkEditResponse } from '../../../hooks/use_bulk_edit_response';
import { useKibana } from '../../../../common/lib/kibana';

const failureMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.bulkSnoozeScheduleFailMessage',
  {
    defaultMessage: 'Failed to bulk snooze rules',
  }
);

const deleteConfirmPlural = (total: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.bulkDeleteConfirmationPlural', {
    defaultMessage:
      'Delete all snooze schedules for {total, plural, one {# rule} other {# rules}}? ',
    values: { total },
  });

const deleteConfirmSingle = (ruleName: string) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.bulkDeleteConfirmationSingle', {
    defaultMessage: 'Delete all snooze schedules for {ruleName}?',
    values: { ruleName },
  });

export type BulkSnoozeScheduleModalProps = {
  rulesToSchedule: RuleTableItem[];
  rulesToUnschedule: RuleTableItem[];
  rulesToScheduleFilter?: KueryNode | null | undefined;
  rulesToUnscheduleFilter?: KueryNode | null | undefined;
  numberOfSelectedRules?: number;
  onClose: () => void;
  onSave: () => void;
  setIsSchedulingRule: (isLoading: boolean) => void;
  setIsUnschedulingRule: (isLoading: boolean) => void;
  onSearchPopulate?: (filter: string) => void;
} & BulkOperationsComponentOpts;

export const BulkSnoozeScheduleModal = (props: BulkSnoozeScheduleModalProps) => {
  const {
    rulesToSchedule,
    rulesToUnschedule,
    rulesToScheduleFilter,
    rulesToUnscheduleFilter,
    numberOfSelectedRules = 0,
    onClose,
    onSave,
    bulkSnoozeRules,
    bulkUnsnoozeRules,
    setIsSchedulingRule,
    setIsUnschedulingRule,
    onSearchPopulate,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const { showToast } = useBulkEditResponse({ onSearchPopulate });

  const isScheduleModalOpen = useMemo(() => {
    if (typeof rulesToScheduleFilter !== 'undefined') {
      return true;
    }
    return rulesToSchedule.length > 0;
  }, [rulesToSchedule, rulesToScheduleFilter]);

  const isUnscheduleModalOpen = useMemo(() => {
    if (typeof rulesToUnscheduleFilter !== 'undefined') {
      return true;
    }
    return rulesToUnschedule.length > 0;
  }, [rulesToUnschedule, rulesToUnscheduleFilter]);

  const onAddSnoozeSchedule = async (schedule: SnoozeSchedule) => {
    onClose();
    setIsSchedulingRule(true);
    try {
      const response = await bulkSnoozeRules({
        ids: rulesToSchedule.map((item) => item.id),
        filter: rulesToScheduleFilter,
        snoozeSchedule: schedule,
      });
      showToast(response, 'snoozeSchedule');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsSchedulingRule(false);
    onSave();
  };

  const onRemoveSnoozeSchedule = async () => {
    onClose();
    setIsUnschedulingRule(true);
    try {
      const response = await bulkUnsnoozeRules({
        ids: rulesToUnschedule.map((item) => item.id),
        filter: rulesToUnscheduleFilter,
        scheduleIds: [],
      });
      showToast(response, 'snoozeSchedule');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsUnschedulingRule(false);
    onSave();
  };

  const confirmationTitle = useMemo(() => {
    if (!rulesToScheduleFilter && numberOfSelectedRules === 1 && rulesToSchedule[0]) {
      return deleteConfirmSingle(rulesToSchedule[0].name);
    }
    return deleteConfirmPlural(numberOfSelectedRules);
  }, [rulesToSchedule, rulesToScheduleFilter, numberOfSelectedRules]);

  if (isUnscheduleModalOpen) {
    return (
      <EuiConfirmModal
        title={confirmationTitle}
        onCancel={onClose}
        onConfirm={onRemoveSnoozeSchedule}
        confirmButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkDeleteConfirmButton',
          {
            defaultMessage: 'Delete',
          }
        )}
        cancelButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkDeleteCancelButton',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="danger"
        defaultFocusedButton="confirm"
        data-test-subj="bulkRemoveScheduleConfirmationModal"
      />
    );
  }

  if (isScheduleModalOpen) {
    return (
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.bulkSnoozeScheduleModal.modalTitle"
              defaultMessage="Add snooze schedule"
            />
            <EuiSpacer size="s" />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <RuleSnoozeScheduler
            bulkSnoozeSchedule
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
