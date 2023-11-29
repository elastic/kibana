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
import { rulesLocatorID, sloFeatureId } from '../../../../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../common/constants';
import { paths } from '../../../../common/locators/paths';
import { SloDeleteConfirmationModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { sloKeys } from '../../../hooks/slo/query_key_factory';
import { useCapabilities } from '../../../hooks/slo/use_capabilities';
import { useCloneSlo } from '../../../hooks/slo/use_clone_slo';
import { useDeleteSlo } from '../../../hooks/slo/use_delete_slo';
import { useSloFormattedSummary } from '../hooks/use_slo_summary';
import { BurnRateRuleFlyout } from './common/burn_rate_rule_flyout';
import { useSloListActions } from '../hooks/use_slo_list_actions';
import { SloItemActions } from './slo_item_actions';
import type { SloRule } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { SloBadges } from './badges/slo_badges';
import { SloSummary } from './slo_summary';

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

  const { sloDetailsUrl } = useSloFormattedSummary(slo);

  const { handleCreateRule, handleDeleteCancel, handleDeleteConfirm } = useSloListActions({
    slo,
    setDeleteConfirmationModalOpen,
    setIsActionsPopoverOpen,
    setIsAddRuleFlyoutOpen,
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
    </EuiPanel>
  );
}
