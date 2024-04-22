/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { asyncScheduler } from 'rxjs';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiPanel,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import { RuleTableItem, SnoozeSchedule } from '../../../../types';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { isRuleSnoozed } from '../../../lib';
import './collapsed_item_actions.scss';
import { futureTimeToInterval, SnoozePanel } from './rule_snooze';
import {
  SNOOZE_FAILED_MESSAGE,
  SNOOZE_SUCCESS_MESSAGE,
  UNSNOOZE_SUCCESS_MESSAGE,
} from './notify_badge';
import { UntrackAlertsModal } from '../../common/components/untrack_alerts_modal';

export type ComponentOpts = {
  item: RuleTableItem;
  onRuleChanged: () => Promise<void>;
  onLoading: (isLoading: boolean) => void;
  onDeleteRule: (item: RuleTableItem) => void;
  onEditRule: (item: RuleTableItem) => void;
  onUpdateAPIKey: (item: RuleTableItem) => void;
  onRunRule: (item: RuleTableItem) => void;
  onCloneRule: (ruleId: string) => void;
} & Pick<
  BulkOperationsComponentOpts,
  'bulkDisableRules' | 'bulkEnableRules' | 'snoozeRule' | 'unsnoozeRule'
>;

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onLoading,
  onRuleChanged,
  bulkDisableRules,
  bulkEnableRules,
  onDeleteRule,
  onEditRule,
  onUpdateAPIKey,
  snoozeRule,
  unsnoozeRule,
  onRunRule,
  onCloneRule,
}: ComponentOpts) => {
  const {
    ruleTypeRegistry,
    notifications: { toasts },
  } = useKibana().services;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(!item.enabled);
  const [isUntrackAlertsModalOpen, setIsUntrackAlertsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsDisabled(!item.enabled);
  }, [item.enabled]);

  const onClose = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const snoozeRuleInternal = useCallback(
    async (snoozeSchedule: SnoozeSchedule) => {
      try {
        onLoading(true);
        await snoozeRule(item, snoozeSchedule);
        await onRuleChanged();
        toasts.addSuccess(SNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        onLoading(false);
        onClose();
      }
      await snoozeRule(item, snoozeSchedule);
    },
    [onLoading, snoozeRule, item, onRuleChanged, toasts, onClose]
  );

  const unsnoozeRuleInternal = useCallback(
    async (scheduleIds?: string[]) => {
      try {
        onLoading(true);
        await unsnoozeRule(item, scheduleIds);
        await onRuleChanged();
        toasts.addSuccess(UNSNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        onLoading(false);
        onClose();
      }
    },
    [onLoading, unsnoozeRule, item, onRuleChanged, toasts, onClose]
  );

  const isRuleTypeEditableInContext = ruleTypeRegistry.has(item.ruleTypeId)
    ? !ruleTypeRegistry.get(item.ruleTypeId).requiresAppContext
    : false;

  const button = (
    <EuiButtonIcon
      disabled={!item.isEditable}
      data-test-subj="selectActionButton"
      data-testid="selectActionButton"
      iconType="boxesHorizontal"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.popoverButtonTitle',
        { defaultMessage: 'Actions' }
      )}
    />
  );

  const isSnoozed = useMemo(() => {
    return isRuleSnoozed(item);
  }, [item]);

  const snoozedButtonText = useMemo(() => {
    if (item.muteAll) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.collapsedItemActions.snoozedIndefinitely',
        {
          defaultMessage: 'Snoozed indefinitely',
        }
      );
    }
    if (isSnoozed) {
      return i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.collapsedItemActions.snoozedUntil',
        {
          defaultMessage: 'Snoozed until {snoozeTime}',
          values: {
            snoozeTime: moment(item.isSnoozedUntil).format('MMM D'),
          },
        }
      );
    }
    return i18n.translate(
      'xpack.triggersActionsUI.sections.rulesList.collapsedItemActions.snooze',
      {
        defaultMessage: 'Snooze',
      }
    );
  }, [isSnoozed, item]);

  const snoozePanelItem = useMemo(() => {
    if (isDisabled || item.consumer === AlertConsumers.SIEM) {
      return [];
    }

    return [
      {
        disabled: !item.isEditable || !item.enabledInLicense,
        'data-test-subj': 'snoozeButton',
        icon: 'bellSlash',
        name: snoozedButtonText,
        panel: 1,
      },
    ];
  }, [isDisabled, item, snoozedButtonText]);

  const onDisableModalOpen = useCallback(() => {
    setIsUntrackAlertsModalOpen(true);
  }, []);

  const onDisableModalClose = useCallback(() => {
    setIsUntrackAlertsModalOpen(false);
  }, []);

  const onEnable = useCallback(async () => {
    asyncScheduler.schedule(async () => {
      await bulkEnableRules({ ids: [item.id] });
      onRuleChanged();
    }, 10);
    setIsDisabled(false);
    setIsPopoverOpen(false);
  }, [bulkEnableRules, onRuleChanged, item.id]);

  const onDisable = useCallback(
    async (untrack: boolean) => {
      onDisableModalClose();
      await bulkDisableRules({ ids: [item.id], untrack });
      onRuleChanged();
      setIsDisabled(true);
      setIsPopoverOpen(false);
    },
    [onDisableModalClose, bulkDisableRules, onRuleChanged, item.id]
  );

  const onDisableClick = useCallback(() => {
    if (isDisabled) {
      onEnable();
    } else {
      onDisableModalOpen();
    }
  }, [isDisabled, onEnable, onDisableModalOpen]);

  const panels = [
    {
      id: 0,
      hasFocus: false,
      items: [
        ...snoozePanelItem,
        {
          isSeparator: true as const,
        },
        {
          disabled: !item.isEditable || !item.enabledInLicense,
          'data-test-subj': 'disableButton',
          onClick: onDisableClick,
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
          disabled: !item.isEditable || item.consumer === AlertConsumers.SIEM,
          'data-test-subj': 'cloneRule',
          onClick: async () => {
            setIsPopoverOpen(!isPopoverOpen);
            onCloneRule(item.id);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.cloneRuleTitle',
            { defaultMessage: 'Clone rule' }
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
          'data-test-subj': 'updateApiKey',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            onUpdateAPIKey(item);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.collapsedItemActions.updateApiKey',
            { defaultMessage: 'Update API key' }
          ),
        },
        {
          disabled: !item.isEditable,
          'data-test-subj': 'runRule',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            onRunRule(item);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.collapsedItemActions.runRule',
            { defaultMessage: 'Run rule' }
          ),
        },
        {
          disabled: !item.isEditable,
          className: 'collapsedItemActions__deleteButton',
          'data-test-subj': 'deleteRule',
          onClick: () => {
            setIsPopoverOpen(!isPopoverOpen);
            onDeleteRule(item);
          },
          name: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.deleteRuleTitle',
            { defaultMessage: 'Delete rule' }
          ),
        },
      ],
    },
    {
      id: 1,
      title: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="bellSlash" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.collapsedItemActons.snoozeActions',
              { defaultMessage: 'Snooze notifications' }
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: 500,
      content: (
        <EuiPanel>
          <SnoozePanel
            interval={futureTimeToInterval(item.isSnoozedUntil)}
            hasTitle={false}
            scheduledSnoozes={item.snoozeSchedule ?? []}
            activeSnoozes={item.activeSnoozes ?? []}
            showCancel={isRuleSnoozed(item)}
            snoozeRule={snoozeRuleInternal}
            unsnoozeRule={unsnoozeRuleInternal}
          />
        </EuiPanel>
      ),
    },
  ];

  return (
    <>
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
          data-testid="collapsedActionPanel"
        />
      </EuiPopover>
      {isUntrackAlertsModalOpen && (
        <UntrackAlertsModal onCancel={onDisableModalClose} onConfirm={onDisable} />
      )}
    </>
  );
};

export const CollapsedItemActionsWithApi = withBulkRuleOperations(CollapsedItemActions);
