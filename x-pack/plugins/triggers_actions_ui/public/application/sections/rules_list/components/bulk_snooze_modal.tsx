/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
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
import { RuleTableItem, SnoozeSchedule } from '../../../../types';
import { SnoozePanel, futureTimeToInterval } from './rule_snooze';
import { isRuleSnoozed } from '../../../lib';
import { useBulkEditResponse } from '../../../hooks/use_bulk_edit_response';
import { useKibana } from '../../../../common/lib/kibana';

export type BulkSnoozeModalProps = {
  rulesToSnooze: RuleTableItem[];
  rulesToSnoozeFilter?: string;
  onClose: () => void;
  onSave: () => void;
  setIsLoading: (isLoading: boolean) => void;
  onSearchPopulate?: (filter: string) => void;
} & BulkOperationsComponentOpts;

const failureMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.bulkSnoozeFailMessage',
  {
    defaultMessage: 'Failed to bulk snooze rules',
  }
);

export const BulkSnoozeModal = (props: BulkSnoozeModalProps) => {
  const {
    rulesToSnooze,
    rulesToSnoozeFilter,
    onClose,
    onSave,
    setIsLoading,
    onSearchPopulate,
    bulkSnoozeRules,
    bulkUnsnoozeRules,
  } = props;

  const {
    notifications: { toasts },
  } = useKibana().services;

  const { showToast } = useBulkEditResponse({ onSearchPopulate });

  const isSnoozeModalOpen = useMemo(() => {
    if (rulesToSnoozeFilter) {
      return true;
    }
    return rulesToSnooze.length > 0;
  }, [rulesToSnooze, rulesToSnoozeFilter]);

  const isSnoozed = useMemo(() => {
    if (rulesToSnoozeFilter) {
      return true;
    }
    return rulesToSnooze.some((item) => isRuleSnoozed(item));
  }, [rulesToSnooze, rulesToSnoozeFilter]);

  const interval = useMemo(() => {
    if (rulesToSnoozeFilter) {
      return;
    }
    const rule = rulesToSnooze.find((item) => item.isSnoozedUntil);
    if (rule) {
      return futureTimeToInterval(rule.isSnoozedUntil);
    }
  }, [rulesToSnooze, rulesToSnoozeFilter]);

  const onSnoozeRule = async (schedule: SnoozeSchedule) => {
    onClose();
    setIsLoading(true);
    try {
      const response = await bulkSnoozeRules({
        ids: rulesToSnooze.map((item) => item.id),
        filter: rulesToSnoozeFilter,
        snoozeSchedule: schedule,
      });
      showToast(response, 'snooze');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsLoading(false);
    onSave();
  };

  const onUnsnoozeRule = async (scheduleIds?: string[]) => {
    onClose();
    setIsLoading(true);
    try {
      const response = await bulkUnsnoozeRules({
        ids: rulesToSnooze.map((item) => item.id),
        filter: rulesToSnoozeFilter,
        scheduleIds,
      });
      showToast(response, 'snooze');
    } catch (error) {
      toasts.addError(error, {
        title: failureMessage,
      });
    }
    setIsLoading(false);
    onSave();
  };

  if (isSnoozeModalOpen) {
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
            interval={interval}
            snoozeRule={onSnoozeRule}
            unsnoozeRule={onUnsnoozeRule}
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
  return null;
};

export const BulkSnoozeModalWithApi = withBulkRuleOperations(BulkSnoozeModal);
