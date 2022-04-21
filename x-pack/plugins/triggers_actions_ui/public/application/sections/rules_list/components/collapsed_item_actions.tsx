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

import { useKibana } from '../../../../common/lib/kibana';
import { RuleTableItem } from '../../../../types';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import './collapsed_item_actions.scss';

export type ComponentOpts = {
  item: RuleTableItem;
  onRuleChanged: () => void;
  setRulesToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  onEditRule: (item: RuleTableItem) => void;
} & Pick<BulkOperationsComponentOpts, 'disableRule' | 'enableRule' | 'unmuteRule' | 'muteRule'>;

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onRuleChanged,
  disableRule,
  enableRule,
  unmuteRule,
  muteRule,
  setRulesToDelete,
  onEditRule,
}: ComponentOpts) => {
  const { ruleTypeRegistry } = useKibana().services;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(!item.enabled);
  const [isMuted, setIsMuted] = useState<boolean>(item.muteAll);
  useEffect(() => {
    setIsDisabled(!item.enabled);
    setIsMuted(item.muteAll);
  }, [item.enabled, item.muteAll]);

  const isRuleTypeEditableInContext = ruleTypeRegistry.has(item.ruleTypeId)
    ? !ruleTypeRegistry.get(item.ruleTypeId).requiresAppContext
    : false;

  const button = (
    <EuiButtonIcon
      disabled={!item.isEditable}
      data-test-subj="selectActionButton"
      iconType="boxesHorizontal"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.popoverButtonTitle',
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
                await unmuteRule({ ...item, muteAll });
              } else {
                await muteRule({ ...item, muteAll });
              }
              onRuleChanged();
            }, 10);
            setIsMuted(!isMuted);
            setIsPopoverOpen(!isPopoverOpen);
          },
          name: isMuted
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.unmuteTitle',
                { defaultMessage: 'Unmute' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.muteTitle',
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
                await disableRule({ ...item, enabled });
              } else {
                await enableRule({ ...item, enabled });
              }
              onRuleChanged();
            }, 10);
            setIsDisabled(!isDisabled);
            setIsPopoverOpen(!isPopoverOpen);
          },
          name: isDisabled
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.enableTitle',
                { defaultMessage: 'Enable' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.disableTitle',
                { defaultMessage: 'Disable' }
              ),
        },
        {
          disabled: !item.isEditable || !isRuleTypeEditableInContext,
          'data-test-subj': 'editRule',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            onEditRule(item);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.editTitle',
            { defaultMessage: 'Edit rule' }
          ),
        },
        {
          disabled: !item.isEditable,
          'data-test-subj': 'deleteRule',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            setRulesToDelete([item.id]);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.deleteRuleTitle',
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
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        className="actCollapsedItemActions"
        data-test-subj="collapsedActionPanel"
      />
    </EuiPopover>
  );
};

export const CollapsedItemActionsWithApi = withBulkRuleOperations(CollapsedItemActions);
