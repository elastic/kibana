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
import { RuleTableItem, SnoozeSchedule, BulkEditActions } from '../../../../types';
import { SnoozePanel, futureTimeToInterval } from './rule_snooze';
import { useBulkEditResponse } from '../../../hooks/use_bulk_edit_response';
import { useKibana } from '../../../../common/lib/kibana';

export type BulkSnoozeModalProps = {
  rules: RuleTableItem[];
  filter?: KueryNode | null;
  bulkEditAction?: BulkEditActions;
  numberOfSelectedRules?: number;
  onClose: () => void;
  onSave: () => void;
  setIsBulkEditing: (isLoading: boolean) => void;
  onSearchPopulate?: (filter: string) => void;
} & BulkOperationsComponentOpts;

const failureMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.bulkSnoozeFailMessage',
  {
    defaultMessage: 'Failed to bulk snooze rules',
  }
);

const deleteConfirmPlural = (total: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.bulkUnsnoozeConfirmationPlural', {
    defaultMessage: 'Unsnooze {total, plural, one {# rule} other {# rules}}? ',
    values: { total },
  });

const deleteConfirmSingle = (ruleName: string) =>
  i18n.translate('xpack.triggersActionsUI.sections.rulesList.bulkUnsnoozeConfirmationSingle', {
    defaultMessage: 'Unsnooze {ruleName}?',
    values: { ruleName },
  });

export const BulkSnoozeModal = (props: BulkSnoozeModalProps) => {
  const {
    bulkEditAction,
    rules,
    filter,
    numberOfSelectedRules = 0,
    onClose,
    onSave,
    setIsBulkEditing,
    onSearchPopulate,
    bulkSnoozeRules,
    bulkUnsnoozeRules,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const { showToast } = useBulkEditResponse({ onSearchPopulate });

  const interval = useMemo(() => {
    if (filter) {
      return;
    }
    const rule = rules.find((item) => item.isSnoozedUntil);
    if (rule) {
      return futureTimeToInterval(rule.isSnoozedUntil);
    }
  }, [rules, filter]);

  const onSnoozeRule = async (schedule: SnoozeSchedule) => {
    onClose();
    setIsBulkEditing(true);
    try {
      const response = await bulkSnoozeRules({
        ids: rules.map((item) => item.id),
        filter,
        snoozeSchedule: schedule,
      });
      showToast(response, 'snooze');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsBulkEditing(false);
    onSave();
  };

  const onUnsnoozeRule = async () => {
    onClose();
    setIsBulkEditing(true);
    try {
      const response = await bulkUnsnoozeRules({
        ids: rules.map((item) => item.id),
        filter,
      });
      showToast(response, 'snooze');
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

  if (bulkEditAction === 'unsnooze' && (rules.length || filter)) {
    return (
      <EuiConfirmModal
        title={confirmationTitle}
        onCancel={onClose}
        onConfirm={onUnsnoozeRule}
        confirmButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkUnsnoozeConfirmButton',
          {
            defaultMessage: 'Unsnooze',
          }
        )}
        cancelButtonText={i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkUnsnoozeCancelButton',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="danger"
        defaultFocusedButton="confirm"
        data-test-subj="bulkUnsnoozeConfirmationModal"
      />
    );
  }

  if (bulkEditAction === 'snooze' && (rules.length || filter)) {
    return (
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.bulkSnoozeModal.modalTitle"
              defaultMessage="Add snooze now"
            />
            <EuiSpacer size="s" />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <SnoozePanel
            hasTitle={false}
            showCancel={false}
            showAddSchedule={false}
            interval={interval}
            snoozeRule={onSnoozeRule}
            unsnoozeRule={onUnsnoozeRule}
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

  return null;
};

export const BulkSnoozeModalWithApi = withBulkRuleOperations(BulkSnoozeModal);
