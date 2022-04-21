/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
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
  onPerformingAction?: () => void;
  onActionPerformed?: () => void;
  setRulesToDelete: React.Dispatch<React.SetStateAction<string[]>>;
} & BulkOperationsComponentOpts;

export const RuleQuickEditButtons: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  onPerformingAction = noop,
  onActionPerformed = noop,
  muteRules,
  unmuteRules,
  enableRules,
  disableRules,
  setRulesToDelete,
}: ComponentOpts) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [isMutingRules, setIsMutingRules] = useState<boolean>(false);
  const [isUnmutingRules, setIsUnmutingRules] = useState<boolean>(false);
  const [isEnablingRules, setIsEnablingRules] = useState<boolean>(false);
  const [isDisablingRules, setIsDisablingRules] = useState<boolean>(false);
  const [isDeletingRules, setIsDeletingRules] = useState<boolean>(false);

  const allRulesMuted = selectedItems.every(isRuleMuted);
  const allRulesDisabled = selectedItems.every(isRuleDisabled);
  const isPerformingAction =
    isMutingRules || isUnmutingRules || isEnablingRules || isDisablingRules || isDeletingRules;

  const hasDisabledByLicenseRuleTypes = !!selectedItems.find(
    (alertItem) => !alertItem.enabledInLicense
  );

  async function onmMuteAllClick() {
    onPerformingAction();
    setIsMutingRules(true);
    try {
      await muteRules(selectedItems);
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToMuteRulesMessage',
          {
            defaultMessage: 'Failed to mute rule(s)',
          }
        ),
      });
    } finally {
      setIsMutingRules(false);
      onActionPerformed();
    }
  }

  async function onUnmuteAllClick() {
    onPerformingAction();
    setIsUnmutingRules(true);
    try {
      await unmuteRules(selectedItems);
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.failedToUnmuteRulesMessage',
          {
            defaultMessage: 'Failed to unmute rule(s)',
          }
        ),
      });
    } finally {
      setIsUnmutingRules(false);
      onActionPerformed();
    }
  }

  async function onEnableAllClick() {
    onPerformingAction();
    setIsEnablingRules(true);
    try {
      await enableRules(selectedItems);
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
      await disableRules(selectedItems);
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
      setRulesToDelete(selectedItems.map((selected: any) => selected.id));
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

  return (
    <EuiFlexGroup alignItems="baseline" direction="column" gutterSize="none">
      {!allRulesMuted && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onmMuteAllClick}
            isLoading={isMutingRules}
            isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
            data-test-subj="muteAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.muteAllTitle"
              defaultMessage="Mute"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {allRulesMuted && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onUnmuteAllClick}
            isLoading={isUnmutingRules}
            isDisabled={isPerformingAction || hasDisabledByLicenseRuleTypes}
            data-test-subj="unmuteAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.bulkActionPopover.unmuteAllTitle"
              defaultMessage="Unmute"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
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

function isRuleMuted(alert: RuleTableItem) {
  return alert.muteAll === true;
}

function noop() {}
