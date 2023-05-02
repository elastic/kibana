/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useCapabilities } from '../../../hooks/slo/use_capabilities';
import { useKibana } from '../../../utils/kibana_react';
import { useCloneSlo } from '../../../hooks/slo/use_clone_slo';
import { useGetFilteredRuleTypes } from '../../../hooks/use_get_filtered_rule_types';
import { SloSummary } from './slo_summary';
import { SloDeleteConfirmationModal } from './slo_delete_confirmation_modal';
import { SloBadges } from './badges/slo_badges';
import {
  transformSloResponseToCreateSloInput,
  transformValuesToCreateSLOInput,
} from '../../slo_edit/helpers/process_slo_form_values';
import { SLO_BURN_RATE_RULE_ID } from '../../../../common/constants';
import { rulesLocatorID, sloFeatureId } from '../../../../common';
import { paths } from '../../../config/paths';
import type { ActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import type { SloRule } from '../../../hooks/slo/use_fetch_rules_for_slo';
import type { RulesParams } from '../../../locators/rules';

export interface SloListItemProps {
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: ActiveAlerts;
  onConfirmDelete: (slo: SLOWithSummaryResponse) => void;
}

export function SloListItem({
  slo,
  rules,
  historicalSummary = [],
  historicalSummaryLoading,
  activeAlerts,
  onConfirmDelete,
}: SloListItemProps) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    share: {
      url: { locators },
    },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();
  const queryClient = useQueryClient();

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const { mutate: cloneSlo } = useCloneSlo();

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleViewDetails = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloDetails(slo.id)));
  };

  const handleEdit = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
  };

  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

  const handleSavedRule = async () => {
    queryClient.invalidateQueries(['fetchRulesForSlo']);
  };

  const handleNavigateToRules = async () => {
    const locator = locators.get<RulesParams>(rulesLocatorID);

    locator?.navigate(
      {
        params: { sloId: slo.id },
      },
      {
        replace: true,
      }
    );
  };

  const handleClone = () => {
    const newSlo = transformValuesToCreateSLOInput(
      transformSloResponseToCreateSloInput({ ...slo, name: `[Copy] ${slo.name}` })!
    );

    cloneSlo({ slo: newSlo, idToCopyFrom: slo.id });
    setIsActionsPopoverOpen(false);
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsActionsPopoverOpen(false);
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirmationModalOpen(false);
    onConfirmDelete(slo);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
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
                      <EuiLink data-test-subj="o11ySloListItemLink" onClick={handleViewDetails}>
                        {slo.name}
                      </EuiLink>
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
          <EuiPopover
            anchorPosition="downLeft"
            button={
              <EuiButtonIcon
                aria-label="Actions"
                display="empty"
                color="text"
                iconType="boxesVertical"
                size="s"
                onClick={handleClickActions}
              />
            }
            panelPaddingSize="m"
            closePopover={handleClickActions}
            isOpen={isActionsPopoverOpen}
          >
            <EuiContextMenuPanel
              size="m"
              items={[
                <EuiContextMenuItem
                  key="view"
                  icon="inspect"
                  onClick={handleViewDetails}
                  data-test-subj="sloActionsView"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.details', {
                    defaultMessage: 'Details',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="edit"
                  icon="pencil"
                  disabled={!hasWriteCapabilities}
                  onClick={handleEdit}
                  data-test-subj="sloActionsEdit"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.edit', {
                    defaultMessage: 'Edit',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="createRule"
                  icon="bell"
                  disabled={!hasWriteCapabilities}
                  onClick={handleCreateRule}
                  data-test-subj="sloActionsCreateRule"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.createRule', {
                    defaultMessage: 'Create new alert rule',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="manageRules"
                  icon="gear"
                  disabled={!hasWriteCapabilities}
                  onClick={handleNavigateToRules}
                  data-test-subj="sloActionsManageRules"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.manageRules', {
                    defaultMessage: 'Manage rules',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="clone"
                  disabled={!hasWriteCapabilities}
                  icon="copy"
                  onClick={handleClone}
                  data-test-subj="sloActionsClone"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.clone', {
                    defaultMessage: 'Clone',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="delete"
                  icon="trash"
                  disabled={!hasWriteCapabilities}
                  onClick={handleDelete}
                  data-test-subj="sloActionsDelete"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.delete', {
                    defaultMessage: 'Delete',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isAddRuleFlyoutOpen ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          filteredRuleTypes={filteredRuleTypes}
          ruleTypeId={SLO_BURN_RATE_RULE_ID}
          initialValues={{ name: `${slo.name} Burn Rate rule`, params: { sloId: slo.id } }}
          onSave={handleSavedRule}
          onClose={() => {
            setIsAddRuleFlyoutOpen(false);
          }}
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
