/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { asyncScheduler } from 'rxjs';
import React, { useEffect, useState } from 'react';
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
  EuiIcon,
} from '@elastic/eui';

import { AlertTableItem } from '../../../../types';
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
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(!item.enabled);
  const [isMuted, setIsMuted] = useState<boolean>(item.muteAll);
  useEffect(() => {
    setIsDisabled(!item.enabled);
    setIsMuted(item.muteAll);
  }, [item.enabled, item.muteAll]);

  const button = (
    <EuiButtonIcon
      disabled={!item.isEditable}
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
      <EuiContextMenuPanel className="actCollapsedItemActions" hasFocus={false}>
        <div className="actCollapsedItemActions__item">
          <EuiSwitch
            name="disable"
            disabled={!item.isEditable || !item.enabledInLicense}
            compressed
            checked={isDisabled}
            data-test-subj="disableSwitch"
            onChange={async () => {
              const enabled = !isDisabled;
              asyncScheduler.schedule(async () => {
                if (enabled) {
                  await disableAlert({ ...item, enabled });
                } else {
                  await enableAlert({ ...item, enabled });
                }
                onAlertChanged();
              }, 10);
              setIsDisabled(!isDisabled);
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
              defaultMessage="When disabled, the rule is not checked."
            />
          </EuiText>
        </div>
        <div className="actCollapsedItemActions__item">
          <EuiSwitch
            name="mute"
            checked={isMuted}
            disabled={!(item.isEditable && !isDisabled) || !item.enabledInLicense}
            compressed
            data-test-subj="muteSwitch"
            onChange={async () => {
              const muteAll = isMuted;
              asyncScheduler.schedule(async () => {
                if (muteAll) {
                  await unmuteAlert({ ...item, muteAll });
                } else {
                  await muteAlert({ ...item, muteAll });
                }
                onAlertChanged();
              }, 10);
              setIsMuted(!isMuted);
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
              defaultMessage="When muted, the rule is checked, but no action is performed."
            />
          </EuiText>
        </div>
        <EuiHorizontalRule margin="none" />
        <EuiContextMenuItem
          disabled={!item.isEditable}
          data-test-subj="deleteAlert"
          onClick={() => setAlertsToDelete([item.id])}
        >
          <div className="actCollapsedItemActions__delete">
            <div className="actCollapsedItemActions__deleteIcon">
              <EuiIcon color="danger" type="trash" />
            </div>
            <div className="actCollapsedItemActions__deleteLabel">
              <EuiText size="s" color="danger">
                <p>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.deleteTitle"
                    defaultMessage="Delete"
                  />
                </p>
              </EuiText>
            </div>
          </div>
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};

export const CollapsedItemActionsWithApi = withBulkAlertOperations(CollapsedItemActions);
