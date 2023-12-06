/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { SloDeleteConfirmationModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { useSloFormattedSummary } from '../hooks/use_slo_summary';
import { BurnRateRuleFlyout } from './common/burn_rate_rule_flyout';
import { useSloListActions } from '../hooks/use_slo_list_actions';
import { SloItemActions } from './slo_item_actions';
import type { SloRule } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { SloBadges } from './badges/slo_badges';
import { SloSummary } from './slo_summary';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);
export interface SloListItemProps {
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: number;
}

export function SloListItem({
  slo,
  rules,
  historicalSummary = [],
  historicalSummaryLoading,
  activeAlerts,
}: SloListItemProps) {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);
  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);

  const { sloDetailsUrl } = useSloFormattedSummary(slo);

  const { handleCreateRule, handleDeleteCancel, handleDeleteConfirm, handleAttachToDashboardSave } =
    useSloListActions({
      slo,
      setDeleteConfirmationModalOpen,
      setIsActionsPopoverOpen,
      setIsAddRuleFlyoutOpen,
      setDashboardAttachmentReady,
    });

  return (
    <EuiPanel data-test-subj="sloItem" hasBorder hasShadow={false}>
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiText size="s">
                    {slo.summary ? (
                      <a data-test-subj="o11ySloListItemLink" href={sloDetailsUrl}>
                        {slo.name}
                      </a>
                    ) : (
                      <span>{slo.name}</span>
                    )}
                  </EuiText>
                </EuiFlexItem>
                <SloBadges
                  activeAlerts={activeAlerts}
                  isLoading={!slo.summary}
                  rules={rules}
                  slo={slo}
                  onClickRuleBadge={handleCreateRule}
                />
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              {slo.summary ? (
                <SloSummary
                  slo={slo}
                  historicalSummary={historicalSummary}
                  historicalSummaryLoading={historicalSummaryLoading}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* ACTIONS */}
        <EuiFlexItem grow={false}>
          <SloItemActions
            slo={slo}
            isActionsPopoverOpen={isActionsPopoverOpen}
            setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
            setIsActionsPopoverOpen={setIsActionsPopoverOpen}
            setDeleteConfirmationModalOpen={setDeleteConfirmationModalOpen}
            setDashboardAttachmentReady={setDashboardAttachmentReady}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <BurnRateRuleFlyout
        slo={slo}
        isAddRuleFlyoutOpen={isAddRuleFlyoutOpen}
        setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
      />

      {isDeleteConfirmationModalOpen ? (
        <SloDeleteConfirmationModal
          slo={slo}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}

      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.observability.slo.item.actions.attachToDashboard.objectTypeLabel',
            { defaultMessage: 'SLO Overview' }
          )}
          documentInfo={{
            title: i18n.translate(
              'xpack.observability.slo.item.actions.attachToDashboard.attachmentTitle',
              { defaultMessage: 'SLO Overview' }
            ),
          }}
          canSaveByReference={false}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={handleAttachToDashboardSave}
        />
      ) : null}
    </EuiPanel>
  );
}
