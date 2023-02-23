/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KueryNode } from '@kbn/es-query';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { RuleTableItem, BulkEditActions, UpdateRulesToBulkEditProps } from '../../../../types';
import {
  withBulkRuleOperations,
  ComponentOpts as BulkOperationsComponentOpts,
} from './with_bulk_rule_api_operations';
import './rule_quick_edit_buttons.scss';
import { useKibana } from '../../../../common/lib/kibana';

export type ComponentOpts = {
  selectedItems: RuleTableItem[];
  isAllSelected?: boolean;
  getFilter: () => KueryNode | null;
  onPerformingAction?: () => void;
  onActionPerformed?: () => void;
  bulkEditAction?: BulkEditActions;
  isEnablingRules?: boolean;
  isDisablingRules?: boolean;
  isBulkEditing?: boolean;
  onDisable: () => Promise<void>;
  onEnable: () => Promise<void>;
  updateRulesToBulkEdit: (props: UpdateRulesToBulkEditProps) => void;
} & BulkOperationsComponentOpts;

export const RuleQuickEditButtons: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  isAllSelected = false,
  getFilter,
  onPerformingAction = noop,
  onActionPerformed = noop,
  bulkEditAction,
  isEnablingRules = false,
  isDisablingRules = false,
  isBulkEditing = false,
  updateRulesToBulkEdit,
  onEnable,
  onDisable,
}: ComponentOpts) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const isPerformingAction = isEnablingRules || isDisablingRules || isBulkEditing;

  const hasDisabledByLicenseRuleTypes = useMemo(() => {
    if (isAllSelected) {
      return false;
    }
    return !!selectedItems.find((alertItem) => !alertItem.enabledInLicense);
  }, [selectedItems, isAllSelected]);

  async function deleteSelectedItems() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        updateRulesToBulkEdit({
          action: 'delete',
          filter: getFilter(),
        });
      } else {
        updateRulesToBulkEdit({
          action: 'delete',
          rules: selectedItems,
        });
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToDeleteRulesMessage',
          {
            defaultMessage: 'Failed to delete rules',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function updateAPIKeysClick() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        updateRulesToBulkEdit({
          action: 'updateApiKey',
          filter: getFilter(),
        });
      } else {
        updateRulesToBulkEdit({
          action: 'updateApiKey',
          rules: selectedItems,
        });
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToUpdateRuleAPIKeysMessage',
          {
            defaultMessage: 'Failed to update API keys for rules',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onSnoozeAllClick() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        updateRulesToBulkEdit({
          action: 'snooze',
          filter: getFilter(),
        });
      } else {
        updateRulesToBulkEdit({
          action: 'snooze',
          rules: selectedItems,
        });
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToSnoozeRules',
          {
            defaultMessage: 'Failed to snooze or unsnooze rules',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onUnsnoozeAllClick() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        updateRulesToBulkEdit({
          action: 'unsnooze',
          filter: getFilter(),
        });
      } else {
        updateRulesToBulkEdit({
          action: 'unsnooze',
          rules: selectedItems,
        });
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToSnoozeRules',
          {
            defaultMessage: 'Failed to snooze or unsnooze rules',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onScheduleAllClick() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        updateRulesToBulkEdit({
          action: 'schedule',
          filter: getFilter(),
        });
      } else {
        updateRulesToBulkEdit({
          action: 'schedule',
          rules: selectedItems,
        });
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToSnoozeRules',
          {
            defaultMessage: 'Failed to snooze or unsnooze rules',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onUnscheduleAllClick() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        updateRulesToBulkEdit({
          action: 'unschedule',
          filter: getFilter(),
        });
      } else {
        updateRulesToBulkEdit({
          action: 'unschedule',
          rules: selectedItems,
        });
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToSnoozeRules',
          {
            defaultMessage: 'Failed to snooze or unsnooze rules',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  return (
    <EuiFlexGroup
      alignItems="baseline"
      direction="column"
      gutterSize="none"
      data-test-subj="ruleQuickEditButton"
    >
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onSnoozeAllClick}
          isLoading={isBulkEditing && bulkEditAction === 'snooze'}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkSnooze"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.snoozeAllTitle"
            defaultMessage="Snooze now"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onUnsnoozeAllClick}
          isLoading={isBulkEditing && bulkEditAction === 'unsnooze'}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkUnsnooze"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.unsnoozeAllTitle"
            defaultMessage="Unsnooze now"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onScheduleAllClick}
          isLoading={isBulkEditing && bulkEditAction === 'schedule'}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkSnoozeSchedule"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.snoozeScheduleAllTitle"
            defaultMessage="Schedule snooze"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onUnscheduleAllClick}
          isLoading={isBulkEditing && bulkEditAction === 'unschedule'}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkRemoveSnoozeSchedule"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.removeSnoozeScheduleAllTitle"
            defaultMessage="Unschedule snooze"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onEnable}
          isLoading={isEnablingRules}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkEnable"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.enableAllTitle"
            defaultMessage="Enable"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onDisable}
          isLoading={isDisablingRules}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkDisable"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.disableAllTitle"
            defaultMessage="Disable"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={updateAPIKeysClick}
          isLoading={isBulkEditing && bulkEditAction === 'updateApiKey'}
          isDisabled={isPerformingAction}
          data-test-subj="updateAPIKeys"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.updateRuleAPIKeysTitle"
            defaultMessage="Update API keys"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={deleteSelectedItems}
          isLoading={isBulkEditing && bulkEditAction === 'delete'}
          iconType="trash"
          color="danger"
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkDelete"
          className="actBulkActionPopover__deleteAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.deleteAllTitle"
            defaultMessage="Delete"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleQuickEditButtonsWithApi = withBulkRuleOperations(RuleQuickEditButtons);

function noop() {}
