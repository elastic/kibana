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
import { RuleTableItem, SnoozeSchedule, BulkEditActions } from '../../../../types';
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
  rules: RuleTableItem[];
  filter?: KueryNode | null;
  bulkEditAction?: BulkEditActions;
  numberOfSelectedRules?: number;
  onClose: () => void;
  onSave: () => void;
  setIsBulkEditing: (isLoading: boolean) => void;
  onSearchPopulate?: (filter: string) => void;
} & BulkOperationsComponentOpts;

export const BulkSnoozeScheduleModal = (props: BulkSnoozeScheduleModalProps) => {
  const {
    rules,
    filter,
    bulkEditAction,
    numberOfSelectedRules = 0,
    onClose,
    onSave,
    bulkSnoozeRules,
    bulkUnsnoozeRules,
    setIsBulkEditing,
    onSearchPopulate,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const { showToast } = useBulkEditResponse({ onSearchPopulate });

  const onAddSnoozeSchedule = async (schedule: SnoozeSchedule) => {
    onClose();
    setIsBulkEditing(true);
    try {
      const response = await bulkSnoozeRules({
        ids: rules.map((item) => item.id),
        filter,
        snoozeSchedule: schedule,
      });
      showToast(response, 'snoozeSchedule');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsBulkEditing(false);
    onSave();
  };

  const onRemoveSnoozeSchedule = async () => {
    onClose();
    setIsBulkEditing(true);
    try {
      const response = await bulkUnsnoozeRules({
        ids: rules.map((item) => item.id),
        filter,
        scheduleIds: [],
      });
      showToast(response, 'snoozeSchedule');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsBulkEditing(false);
    onSave();
  };

  const confirmationTitle = useMemo(() => {
    if (!filter && numberOfSelectedRules === 1 && rules[0]) {
      return deleteConfirmSingle(rules[0].name);
    }
    return deleteConfirmPlural(numberOfSelectedRules);
  }, [rules, filter, numberOfSelectedRules]);

  if (bulkEditAction === 'unschedule' && (rules.length || filter)) {
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

  if (bulkEditAction === 'schedule' && (rules.length || filter)) {
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
