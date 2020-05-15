/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { Alert } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import {
  withBulkAlertOperations,
  ComponentOpts as BulkOperationsComponentOpts,
} from './with_bulk_alert_api_operations';
import './alert_quick_edit_buttons.scss';

export type ComponentOpts = {
  selectedItems: Alert[];
  onPerformingAction?: () => void;
  onActionPerformed?: () => void;
  setAlertsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
} & BulkOperationsComponentOpts;

export const AlertQuickEditButtons: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  onPerformingAction = noop,
  onActionPerformed = noop,
  muteAlerts,
  unmuteAlerts,
  enableAlerts,
  disableAlerts,
  setAlertsToDelete,
}: ComponentOpts) => {
  const { toastNotifications } = useAppDependencies();

  const [isMutingAlerts, setIsMutingAlerts] = useState<boolean>(false);
  const [isUnmutingAlerts, setIsUnmutingAlerts] = useState<boolean>(false);
  const [isEnablingAlerts, setIsEnablingAlerts] = useState<boolean>(false);
  const [isDisablingAlerts, setIsDisablingAlerts] = useState<boolean>(false);
  const [isDeletingAlerts, setIsDeletingAlerts] = useState<boolean>(false);

  const allAlertsMuted = selectedItems.every(isAlertMuted);
  const allAlertsDisabled = selectedItems.every(isAlertDisabled);
  const isPerformingAction =
    isMutingAlerts || isUnmutingAlerts || isEnablingAlerts || isDisablingAlerts || isDeletingAlerts;

  async function onmMuteAllClick() {
    onPerformingAction();
    setIsMutingAlerts(true);
    try {
      await muteAlerts(selectedItems);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToMuteAlertsMessage',
          {
            defaultMessage: 'Failed to mute alert(s)',
          }
        ),
      });
    } finally {
      setIsMutingAlerts(false);
      onActionPerformed();
    }
  }

  async function onUnmuteAllClick() {
    onPerformingAction();
    setIsUnmutingAlerts(true);
    try {
      await unmuteAlerts(selectedItems);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToUnmuteAlertsMessage',
          {
            defaultMessage: 'Failed to unmute alert(s)',
          }
        ),
      });
    } finally {
      setIsUnmutingAlerts(false);
      onActionPerformed();
    }
  }

  async function onEnableAllClick() {
    onPerformingAction();
    setIsEnablingAlerts(true);
    try {
      await enableAlerts(selectedItems);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToEnableAlertsMessage',
          {
            defaultMessage: 'Failed to enable alert(s)',
          }
        ),
      });
    } finally {
      setIsEnablingAlerts(false);
      onActionPerformed();
    }
  }

  async function onDisableAllClick() {
    onPerformingAction();
    setIsDisablingAlerts(true);
    try {
      await disableAlerts(selectedItems);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToDisableAlertsMessage',
          {
            defaultMessage: 'Failed to disable alert(s)',
          }
        ),
      });
    } finally {
      setIsDisablingAlerts(false);
      onActionPerformed();
    }
  }

  async function deleteSelectedItems() {
    onPerformingAction();
    setIsDeletingAlerts(true);
    try {
      setAlertsToDelete(selectedItems.map((selected: any) => selected.id));
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToDeleteAlertsMessage',
          {
            defaultMessage: 'Failed to delete alert(s)',
          }
        ),
      });
    } finally {
      setIsDeletingAlerts(false);
      onActionPerformed();
    }
  }

  return (
    <EuiFlexGroup alignItems="baseline" direction="column" gutterSize="none">
      {!allAlertsMuted && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onmMuteAllClick}
            isLoading={isMutingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="muteAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.muteAllTitle"
              defaultMessage="Mute"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {allAlertsMuted && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onUnmuteAllClick}
            isLoading={isUnmutingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="unmuteAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.unmuteAllTitle"
              defaultMessage="Unmute"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {allAlertsDisabled && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onEnableAllClick}
            isLoading={isEnablingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="enableAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.enableAllTitle"
              defaultMessage="Enable"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {!allAlertsDisabled && (
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={onDisableAllClick}
            isLoading={isDisablingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="disableAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.disableAllTitle"
              defaultMessage="Disable"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={deleteSelectedItems}
          isLoading={isDeletingAlerts}
          iconType="trash"
          color="danger"
          isDisabled={isPerformingAction}
          data-test-subj="deleteAll"
          className="actBulkActionPopover__deleteAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.deleteAllTitle"
            defaultMessage="Delete"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const AlertQuickEditButtonsWithApi = withBulkAlertOperations(AlertQuickEditButtons);

function isAlertDisabled(alert: Alert) {
  return alert.enabled === false;
}

function isAlertMuted(alert: Alert) {
  return alert.muteAll === true;
}

function noop() {}
