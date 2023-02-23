/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';
import { CommentType } from '@kbn/cases-plugin/common';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiPopover, EuiText } from '@elastic/eui';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';

import { useKibana } from '../../../utils/kibana_react';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { ObservabilityAppServices } from '../../../application/types';
import { TopAlert } from '../../alerts';

export interface HeaderActionsProps {
  alert: TopAlert | null;
}

export function HeaderActions({ alert }: HeaderActionsProps) {
  const {
    http,
    cases: {
      hooks: { getUseCasesAddToExistingCaseModal },
    },
    triggersActionsUi: { getEditAlertFlyout, getRuleSnoozeModal },
  } = useKibana<ObservabilityAppServices>().services;

  const { rule, reloadRule } = useFetchRule({
    http,
    ruleId: alert?.fields[ALERT_RULE_UUID] || '',
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [ruleConditionsFlyoutOpen, setRuleConditionsFlyoutOpen] = useState<boolean>(false);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState<boolean>(false);

  const selectCaseModal = getUseCasesAddToExistingCaseModal();

  const handleTogglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const handleClosePopover = () => setIsPopoverOpen(false);

  const attachments: CaseAttachmentsWithoutOwner =
    alert && rule
      ? [
          {
            alertId: alert?.fields[ALERT_UUID] || '',
            index: '.internal.alerts-observability.metrics.alerts-*',
            rule: {
              id: rule.id,
              name: rule.name,
            },
            type: CommentType.alert,
          },
        ]
      : [];

  const handleAddToCase = () => {
    setIsPopoverOpen(false);
    selectCaseModal.open({ attachments });
  };

  const handleViewRuleDetails = () => {
    setIsPopoverOpen(false);
    setRuleConditionsFlyoutOpen(true);
  };

  const handleOpenSnoozeModal = () => {
    setIsPopoverOpen(false);
    setSnoozeModalOpen(true);
  };

  return (
    <>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={handleClosePopover}
        button={
          <EuiButton
            fill
            iconType="arrowDown"
            iconSide="right"
            onClick={handleTogglePopover}
            data-test-subj="alert-details-header-actions-menu-button"
          >
            {i18n.translate('xpack.observability.alertDetails.actionsButtonLabel', {
              defaultMessage: 'Actions',
            })}
          </EuiButton>
        }
      >
        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
          <EuiButtonEmpty
            size="s"
            color="text"
            disabled={!alert?.fields[ALERT_RULE_UUID]}
            onClick={handleViewRuleDetails}
            data-test-subj="view-rule-details-button"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.viewRuleDetails', {
                defaultMessage: 'View rule details',
              })}
            </EuiText>
          </EuiButtonEmpty>

          <EuiButtonEmpty
            size="s"
            color="text"
            onClick={handleOpenSnoozeModal}
            data-test-subj="snooze-rule-button"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.editSnoozeRule', {
                defaultMessage: 'Snooze the rule',
              })}
            </EuiText>
          </EuiButtonEmpty>

          <EuiButtonEmpty
            size="s"
            color="text"
            onClick={handleAddToCase}
            data-test-subj="add-to-case-button"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.addToCase', {
                defaultMessage: 'Add to case',
              })}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiPopover>

      {rule && ruleConditionsFlyoutOpen
        ? getEditAlertFlyout({
            initialRule: rule,
            onClose: () => {
              setRuleConditionsFlyoutOpen(false);
            },
            onSave: reloadRule,
          })
        : null}

      {rule && snoozeModalOpen
        ? getRuleSnoozeModal({
            rule,
            onClose: () => setSnoozeModalOpen(false),
            onRuleChanged: reloadRule,
            onLoading: noop,
          })
        : null}
    </>
  );
}
