/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiButtonEmpty,
  EuiModalHeaderTitle,
  EuiConfirmModal,
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
  rulesToScheduleFilter?: string;
  numberOfSelectedRules?: number;
  onClose: () => void;
  onSave: () => void;
  setIsLoading: (isLoading: boolean) => void;
  onSearchPopulate?: (filter: string) => void;
} & BulkOperationsComponentOpts;

export const BulkSnoozeScheduleModal = (props: BulkSnoozeScheduleModalProps) => {
  const {
    rulesToSchedule,
    rulesToScheduleFilter,
    numberOfSelectedRules = 0,
    onClose,
    onSave,
    bulkSnoozeRules,
    bulkUnsnoozeRules,
    setIsLoading,
    onSearchPopulate,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const { showToast } = useBulkEditResponse({ onSearchPopulate });

  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  const isScheduleModalOpen = useMemo(() => {
    if (rulesToScheduleFilter) {
      return true;
    }
    return rulesToSchedule.length > 0;
  }, [rulesToSchedule, rulesToScheduleFilter]);

  const onAddSnoozeSchedule = async (schedule: SnoozeSchedule) => {
    onClose();
    setIsLoading(true);
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
    setIsLoading(false);
    onSave();
  };

  const onRemoveSnoozeSchedule = async () => {
    setShowConfirmation(false);
    onClose();
    setIsLoading(true);
    try {
      const response = await bulkUnsnoozeRules({
        ids: rulesToSchedule.map((item) => item.id),
        filter: rulesToScheduleFilter,
        scheduleIds: [],
      });
      showToast(response, 'snoozeSchedule');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsLoading(false);
    onSave();
  };

  const confirmationTitle = useMemo(() => {
    if (!rulesToScheduleFilter && numberOfSelectedRules === 1 && rulesToSchedule[0]) {
      return deleteConfirmSingle(rulesToSchedule[0].name);
    }
    return deleteConfirmPlural(numberOfSelectedRules);
  }, [rulesToSchedule, rulesToScheduleFilter, numberOfSelectedRules]);

  if (showConfirmation) {
    return (
      <EuiConfirmModal
        title={confirmationTitle}
        onCancel={() => {
          setShowConfirmation(false);
          onClose();
        }}
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
            showDelete
            bulkSnoozeSchedule
            hasTitle={false}
            isLoading={false}
            initialSchedule={null}
            onSaveSchedule={onAddSnoozeSchedule}
            onCancelSchedules={() => setShowConfirmation(true)}
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
