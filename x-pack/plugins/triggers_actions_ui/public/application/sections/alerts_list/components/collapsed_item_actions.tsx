/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { asyncScheduler } from 'rxjs';
import React, { useEffect, useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';

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
  onEditAlert: (item: AlertTableItem) => void;
} & BulkOperationsComponentOpts;

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onAlertChanged,
  disableAlert,
  enableAlert,
  unmuteAlert,
  muteAlert,
  setAlertsToDelete,
  onEditAlert,
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
      iconType="boxesHorizontal"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.popoverButtonTitle',
        { defaultMessage: 'Actions' }
      )}
    />
  );

  const panels = [
    {
      id: 0,
      hasFocus: false,
      items: [
        {
          disabled: !(item.isEditable && !isDisabled) || !item.enabledInLicense,
          'data-test-subj': 'muteButton',
          onClick: async () => {
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
            setIsPopoverOpen(!isPopoverOpen);
          },
          name: isMuted
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.unmuteTitle',
                { defaultMessage: 'Unmute' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.muteTitle',
                { defaultMessage: 'Mute' }
              ),
        },
        {
          disabled: !item.isEditable || !item.enabledInLicense,
          'data-test-subj': 'disableButton',
          onClick: async () => {
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
            setIsPopoverOpen(!isPopoverOpen);
          },
          name: isDisabled
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.enableTitle',
                { defaultMessage: 'Enable' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.disableTitle',
                { defaultMessage: 'Disable' }
              ),
        },
        {
          disabled: !item.isEditable,
          'data-test-subj': 'editAlert',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            onEditAlert(item);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.editTitle',
            { defaultMessage: 'Edit rule' }
          ),
        },
        {
          disabled: !item.isEditable,
          'data-test-subj': 'deleteAlert',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            setAlertsToDelete([item.id]);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.deleteRuleTitle',
            { defaultMessage: 'Delete rule' }
          ),
        },
      ],
    },
  ];

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
      panelPaddingSize="none"
      data-test-subj="collapsedItemActions"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} className="actCollapsedItemActions" />
    </EuiPopover>
  );
};

export const CollapsedItemActionsWithApi = withBulkAlertOperations(CollapsedItemActions);
