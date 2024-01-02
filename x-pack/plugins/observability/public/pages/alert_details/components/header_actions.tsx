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
import { AttachmentType } from '@kbn/cases-plugin/common';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';

import { useKibana } from '../../../utils/kibana_react';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import type { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';

export interface HeaderActionsProps {
  alert: TopAlert | null;
}

export function HeaderActions({ alert }: HeaderActionsProps) {
  const {
    cases: {
      hooks: { useCasesAddToExistingCaseModal },
    },
    triggersActionsUi: { getEditRuleFlyout: EditRuleFlyout, getRuleSnoozeModal: RuleSnoozeModal },
    http,
  } = useKibana().services;

  const { rule, refetch } = useFetchRule({
    ruleId: alert?.fields[ALERT_RULE_UUID] || '',
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [ruleConditionsFlyoutOpen, setRuleConditionsFlyoutOpen] = useState<boolean>(false);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState<boolean>(false);

  const selectCaseModal = useCasesAddToExistingCaseModal();

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
            type: AttachmentType.alert,
          },
        ]
      : [];

  const handleAddToCase = () => {
    setIsPopoverOpen(false);
    selectCaseModal.open({ getAttachments: () => attachments });
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
        ownFocus
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
            iconType="plusInCircle"
            onClick={handleAddToCase}
            data-test-subj="add-to-case-button"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.addToCase', {
                defaultMessage: 'Add to case',
              })}
            </EuiText>
          </EuiButtonEmpty>

          <EuiButtonEmpty
            size="s"
            color="text"
            iconType="pencil"
            onClick={handleViewRuleDetails}
            data-test-subj="edit-rule-button"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.editRule', {
                defaultMessage: 'Edit rule',
              })}
            </EuiText>
          </EuiButtonEmpty>

          <EuiButtonEmpty
            size="s"
            color="text"
            iconType="bellSlash"
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
            iconType="eyeClosed"
            onClick={() => {}}
            data-test-subj="untrack-alert-button"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.untrackAlert', {
                defaultMessage: 'Mark as untracked',
              })}
            </EuiText>
          </EuiButtonEmpty>

          <EuiHorizontalRule margin="none" />

          <EuiButtonEmpty
            size="s"
            color="text"
            iconType="link"
            disabled={!alert?.fields[ALERT_RULE_UUID] || !rule}
            data-test-subj="view-rule-details-button"
            href={rule ? http.basePath.prepend(paths.observability.ruleDetails(rule.id)) : ''}
            target="_blank"
          >
            <EuiText size="s">
              {i18n.translate('xpack.observability.alertDetails.viewRuleDetails', {
                defaultMessage: 'Go to rule details',
              })}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiPopover>

      {rule && ruleConditionsFlyoutOpen ? (
        <EditRuleFlyout
          initialRule={rule}
          onClose={() => {
            setRuleConditionsFlyoutOpen(false);
          }}
          onSave={async () => {
            refetch();
          }}
        />
      ) : null}

      {rule && snoozeModalOpen ? (
        <RuleSnoozeModal
          rule={rule}
          onClose={() => setSnoozeModalOpen(false)}
          onRuleChanged={async () => {
            refetch();
          }}
          onLoading={noop}
        />
      ) : null}
    </>
  );
}
