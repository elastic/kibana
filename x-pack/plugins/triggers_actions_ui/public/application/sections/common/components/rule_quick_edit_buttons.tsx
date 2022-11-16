/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KueryNode } from '@kbn/es-query';
import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup, EuiIconTip } from '@elastic/eui';

import { RuleTableItem } from '../../../../types';
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
  isDeletingRules?: boolean;
  isSnoozingRules?: boolean;
  isUnsnoozingRules?: boolean;
  isSchedulingRules?: boolean;
  isUnschedulingRules?: boolean;
  isUpdatingRuleAPIKeys?: boolean;
  setRulesToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setRulesToDeleteFilter: React.Dispatch<React.SetStateAction<KueryNode | null | undefined>>;
  setRulesToUpdateAPIKey: React.Dispatch<React.SetStateAction<string[]>>;
  setRulesToSnooze: React.Dispatch<React.SetStateAction<RuleTableItem[]>>;
  setRulesToUnsnooze: React.Dispatch<React.SetStateAction<RuleTableItem[]>>;
  setRulesToSchedule: React.Dispatch<React.SetStateAction<RuleTableItem[]>>;
  setRulesToUnschedule: React.Dispatch<React.SetStateAction<RuleTableItem[]>>;
  setRulesToSnoozeFilter: React.Dispatch<React.SetStateAction<KueryNode | null | undefined>>;
  setRulesToUnsnoozeFilter: React.Dispatch<React.SetStateAction<KueryNode | null | undefined>>;
  setRulesToScheduleFilter: React.Dispatch<React.SetStateAction<KueryNode | null | undefined>>;
  setRulesToUnscheduleFilter: React.Dispatch<React.SetStateAction<KueryNode | null | undefined>>;
  setRulesToUpdateAPIKeyFilter: React.Dispatch<React.SetStateAction<KueryNode | null | undefined>>;
} & BulkOperationsComponentOpts;

const ButtonWithTooltip = ({
  showTooltip,
  tooltip,
  children,
}: {
  showTooltip: boolean;
  tooltip: string;
  children: JSX.Element;
}) => {
  if (!showTooltip) {
    return children;
  }
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip position="right" color="warning" size="s" type="alert" content={tooltip} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleQuickEditButtons: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  isAllSelected = false,
  getFilter,
  onPerformingAction = noop,
  onActionPerformed = noop,
  isDeletingRules = false,
  isSnoozingRules = false,
  isUnsnoozingRules = false,
  isSchedulingRules = false,
  isUnschedulingRules = false,
  isUpdatingRuleAPIKeys = false,
  enableRules,
  disableRules,
  setRulesToDelete,
  setRulesToDeleteFilter,
  setRulesToUpdateAPIKey,
  setRulesToSnooze,
  setRulesToUnsnooze,
  setRulesToSchedule,
  setRulesToUnschedule,
  setRulesToSnoozeFilter,
  setRulesToUnsnoozeFilter,
  setRulesToScheduleFilter,
  setRulesToUnscheduleFilter,
  setRulesToUpdateAPIKeyFilter,
}: ComponentOpts) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [isEnablingRules, setIsEnablingRules] = useState<boolean>(false);
  const [isDisablingRules, setIsDisablingRules] = useState<boolean>(false);

  const isPerformingAction =
    isEnablingRules ||
    isDisablingRules ||
    isDeletingRules ||
    isSnoozingRules ||
    isUnsnoozingRules ||
    isSchedulingRules ||
    isUnschedulingRules ||
    isUpdatingRuleAPIKeys;

  const allRulesDisabled = useMemo(() => {
    if (isAllSelected) {
      return false;
    }
    return selectedItems.every(isRuleDisabled);
  }, [selectedItems, isAllSelected]);

  const hasDisabledByLicenseRuleTypes = useMemo(() => {
    if (isAllSelected) {
      return false;
    }
    return !!selectedItems.find((alertItem) => !alertItem.enabledInLicense);
  }, [selectedItems, isAllSelected]);

  async function onEnableAllClick() {
    if (isAllSelected) {
      return;
    }
    onPerformingAction();
    setIsEnablingRules(true);
    try {
      await enableRules(selectedItems);
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToEnableRulesMessage',
          {
            defaultMessage: 'Failed to enable rules',
          }
        ),
      });
    } finally {
      setIsEnablingRules(false);
      onActionPerformed();
    }
  }

  async function onDisableAllClick() {
    if (isAllSelected) {
      return;
    }
    onPerformingAction();
    setIsDisablingRules(true);
    try {
      await disableRules(selectedItems);
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToDisableRulesMessage',
          {
            defaultMessage: 'Failed to disable rules',
          }
        ),
      });
    } finally {
      setIsDisablingRules(false);
      onActionPerformed();
    }
  }

  async function deleteSelectedItems() {
    onPerformingAction();
    try {
      if (isAllSelected) {
        setRulesToDeleteFilter(getFilter());
      } else {
        setRulesToDelete(selectedItems.map((selected) => selected.id));
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
        setRulesToUpdateAPIKeyFilter(getFilter());
      } else {
        setRulesToUpdateAPIKey(selectedItems.map((selected: any) => selected.id));
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
        setRulesToSnoozeFilter(getFilter());
      } else {
        setRulesToSnooze(selectedItems);
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
        setRulesToUnsnoozeFilter(getFilter());
      } else {
        setRulesToUnsnooze(selectedItems);
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
        setRulesToScheduleFilter(getFilter());
      } else {
        setRulesToSchedule(selectedItems);
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
        setRulesToUnscheduleFilter(getFilter());
      } else {
        setRulesToUnschedule(selectedItems);
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
          isLoading={isSnoozingRules}
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
          isLoading={isUnsnoozingRules}
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
          isLoading={isSchedulingRules}
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
          isLoading={isUnschedulingRules}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkRemoveSnoozeSchedule"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.removeSnoozeScheduleAllTitle"
            defaultMessage="Unschedule snooze"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <ButtonWithTooltip
        showTooltip={isAllSelected}
        tooltip={i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.enableDisableUnsupported',
          {
            defaultMessage: 'Bulk enable or disable is unsupported when selecting all rules.',
          }
        )}
      >
        <>
          {allRulesDisabled && (
            <EuiFlexItem>
              <EuiButtonEmpty
                onClick={onEnableAllClick}
                isLoading={isEnablingRules}
                isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes || isAllSelected}
                data-test-subj="enableAll"
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.enableAllTitle"
                  defaultMessage="Enable"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {!allRulesDisabled && (
            <EuiFlexItem>
              <EuiButtonEmpty
                onClick={onDisableAllClick}
                isLoading={isDisablingRules}
                isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes || isAllSelected}
                data-test-subj="disableAll"
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.disableAllTitle"
                  defaultMessage="Disable"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </>
      </ButtonWithTooltip>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={updateAPIKeysClick}
          isLoading={isUpdatingRuleAPIKeys}
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
          isLoading={isDeletingRules}
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

function isRuleDisabled(alert: RuleTableItem) {
  return alert.enabled === false;
}

function noop() {}
