/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { ALL_VALUE, HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { SLOItemActions } from './slo_item_actions';
import { SloDeleteConfirmationModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { sloFeatureId } from '../../../../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../common/constants';
import { paths } from '../../../../common/locators/paths';
import { sloKeys } from '../../../hooks/slo/query_key_factory';
import { useDeleteSlo } from '../../../hooks/slo/use_delete_slo';
import type { SloRule } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { useGetFilteredRuleTypes } from '../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../utils/kibana_react';
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
  const {
    http: { basePath },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;
  const queryClient = useQueryClient();

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const { mutate: deleteSlo } = useDeleteSlo();

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const sloDetailsUrl = basePath.prepend(
    paths.observability.sloDetails(
      slo.id,
      slo.groupBy !== ALL_VALUE && slo.instanceId ? slo.instanceId : undefined
    )
  );

  const handleSavedRule = async () => {
    queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirmationModalOpen(false);
    deleteSlo({ id: slo.id, name: slo.name });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
  };
  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

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
          <SLOItemActions
            slo={slo}
            isActionsPopoverOpen={isActionsPopoverOpen}
            setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
            setIsActionsPopoverOpen={setIsActionsPopoverOpen}
            setDeleteConfirmationModalOpen={setDeleteConfirmationModalOpen}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isAddRuleFlyoutOpen ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          filteredRuleTypes={filteredRuleTypes}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          initialValues={{ name: `${slo.name} Burn Rate rule`, params: { sloId: slo.id } }}
          onSave={handleSavedRule}
          onClose={() => {
            setIsAddRuleFlyoutOpen(false);
          }}
          useRuleProducer
        />
      ) : null}

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
