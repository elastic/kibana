/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiSwitch,
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { AlertTableItem } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import { hasDeleteAlertsCapability, hasSaveAlertsCapability } from '../../../lib/capabilities';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import './collapsed_item_actions.scss';

export type ComponentOpts = {
  item: AlertTableItem;
  onAlertChanged: () => void;
  setAlertsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
} & BulkOperationsComponentOpts;

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onAlertChanged,
  disableAlert,
  enableAlert,
  unmuteAlert,
  muteAlert,
  setAlertsToDelete,
}: ComponentOpts) => {
  const { capabilities } = useAppDependencies();

  const canDelete = hasDeleteAlertsCapability(capabilities);
  const canSave = hasSaveAlertsCapability(capabilities);

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const button = (
    <EuiButtonIcon
      disabled={!canDelete && !canSave}
      iconType="boxesVertical"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.popoverButtonTitle',
        { defaultMessage: 'Actions' }
      )}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
      panelPaddingSize="none"
      data-test-subj="collapsedItemActions"
    >
      <EuiContextMenuPanel hasFocus={false}>
        <EuiContextMenuItem className="actCollapsedItemActions__item">
          <EuiSwitch
            name="disable"
            disabled={!canSave}
            compressed
            checked={!item.enabled}
            data-test-subj="enableSwitch"
            onChange={async () => {
              if (item.enabled) {
                await disableAlert(item);
              } else {
                await enableAlert(item);
              }
              onAlertChanged();
            }}
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.disableTitle"
                defaultMessage="Disable"
              />
            }
          />
          <EuiSpacer size="xs" />
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.disableHelpText"
              defaultMessage="When disabled, the alert is not checked"
            />
          </EuiText>
        </EuiContextMenuItem>
        <EuiContextMenuItem className="actCollapsedItemActions__item">
          <EuiSwitch
            name="mute"
            checked={item.muteAll}
            disabled={!(canSave && item.enabled)}
            compressed
            data-test-subj="muteSwitch"
            onChange={async () => {
              if (item.muteAll) {
                await unmuteAlert(item);
              } else {
                await muteAlert(item);
              }
              onAlertChanged();
            }}
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.muteTitle"
                defaultMessage="Mute"
              />
            }
          />
          <EuiSpacer size="xs" />
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.muteHelpText"
              defaultMessage="When muted, the alert is checked, but no action is performed"
            />
          </EuiText>
        </EuiContextMenuItem>
        <EuiHorizontalRule margin="none" />
        <EuiContextMenuItem
          disabled={!canDelete}
          icon="trash"
          data-test-subj="deleteAlert"
          onClick={() => setAlertsToDelete([item.id])}
          className="actCollapsedItemActions__delete"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.deleteTitle"
            defaultMessage="Delete"
          />
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};

export const CollapsedItemActionsWithApi = withBulkAlertOperations(CollapsedItemActions);
