/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

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
  getFilter: () => string;
  onPerformingAction?: () => void;
  onActionPerformed?: () => void;
  setRulesToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setRulesToUpdateAPIKey: React.Dispatch<React.SetStateAction<string[]>>;
  setRulesToSnooze: React.Dispatch<React.SetStateAction<RuleTableItem[]>>;
  setRulesToSchedule: React.Dispatch<React.SetStateAction<RuleTableItem[]>>;
  setRulesToDeleteFilter: React.Dispatch<React.SetStateAction<string>>;
  setRulesToSnoozeFilter: React.Dispatch<React.SetStateAction<string>>;
  setRulesToScheduleFilter: React.Dispatch<React.SetStateAction<string>>;
  setRulesToUpdateAPIKeyFilter: React.Dispatch<React.SetStateAction<string>>;
} & BulkOperationsComponentOpts;

export const RuleQuickEditButtons: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  isAllSelected = false,
  getFilter,
  onPerformingAction = noop,
  onActionPerformed = noop,
  bulkEnableRules,
  bulkDisableRules,
  setRulesToDelete,
  setRulesToUpdateAPIKey,
  setRulesToSnooze,
  setRulesToSchedule,
  setRulesToDeleteFilter,
  setRulesToSnoozeFilter,
  setRulesToScheduleFilter,
  setRulesToUpdateAPIKeyFilter,
}: ComponentOpts) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [isEnablingRules, setIsEnablingRules] = useState<boolean>(false);
  const [isDisablingRules, setIsDisablingRules] = useState<boolean>(false);
  const [isDeletingRules, setIsDeletingRules] = useState<boolean>(false);
  const [isSnoozingRules, setIsSnoozingRules] = useState<boolean>(false);
  const [isSchedulingRules, setIsSchedulingRules] = useState<boolean>(false);
  const [isUpdatingRuleAPIKeys, setIsUpdatingRuleAPIKeys] = useState<boolean>(false);

  const isPerformingAction =
    isEnablingRules || isDisablingRules || isDeletingRules || isSnoozingRules || isSchedulingRules;

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
    onPerformingAction();
    setIsEnablingRules(true);
    try {
      await bulkEnableRules({ ids: selectedItems.map((item) => item.id), filter: getFilter() });
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToEnableRulesMessage',
          {
            defaultMessage: 'Failed to enable rule(s)',
          }
        ),
      });
    } finally {
      setIsEnablingRules(false);
      onActionPerformed();
    }
  }

  async function onDisableAllClick() {
    onPerformingAction();
    setIsDisablingRules(true);
    try {
      await bulkDisableRules({ ids: selectedItems.map((item) => item.id), filter: getFilter() });
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToDisableRulesMessage',
          {
            defaultMessage: 'Failed to disable rule(s)',
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
    setIsDeletingRules(true);
    try {
      if (isAllSelected) {
        setRulesToDeleteFilter(getFilter());
      } else {
        setRulesToDelete(selectedItems.map((selected: any) => selected.id));
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToDeleteRulesMessage',
          {
            defaultMessage: 'Failed to delete rule(s)',
          }
        ),
      });
    } finally {
      setIsDeletingRules(false);
      onActionPerformed();
    }
  }

  async function updateAPIKeysClick() {
    onPerformingAction();
    setIsUpdatingRuleAPIKeys(true);
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
            defaultMessage: 'Failed to update API keys for rule(s)',
          }
        ),
      });
    } finally {
      setIsUpdatingRuleAPIKeys(false);
      onActionPerformed();
    }
  }

  async function onSnoozeAllClick() {
    onPerformingAction();
    setIsSnoozingRules(true);
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
            defaultMessage: 'Failed to snooze/unsnooze rule(s)',
          }
        ),
      });
    } finally {
      setIsSnoozingRules(false);
      onActionPerformed();
    }
  }

  async function onScheduleAllClick() {
    onPerformingAction();
    setIsSchedulingRules(true);
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
            defaultMessage: 'Failed to snooze/unsnooze rule(s)',
          }
        ),
      });
    } finally {
      setIsSchedulingRules(false);
      onActionPerformed();
    }
  }

  return (
    <EuiFlexGroup alignItems="baseline" direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={onSnoozeAllClick}
          isLoading={isSnoozingRules}
          isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
          data-test-subj="bulkSnooze"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.snoozeAllTitle"
            defaultMessage="Snooze"
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
            defaultMessage="Schedule"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      {allRulesDisabled && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onEnableAllClick}
            isLoading={isEnablingRules}
            isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
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
            isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
            data-test-subj="disableAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.disableAllTitle"
              defaultMessage="Disable"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={updateAPIKeysClick}
          isLoading={isUpdatingRuleAPIKeys}
          isDisabled={isPerformingAction}
          data-test-subj="updateAPIKeys"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.updateRuleAPIKeysTitle"
            defaultMessage="Update API Keys"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={deleteSelectedItems}
          isLoading={isDeletingRules}
          iconType="trash"
          color="danger"
          isDisabled={isPerformingAction}
          data-test-subj="deleteAll"
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
