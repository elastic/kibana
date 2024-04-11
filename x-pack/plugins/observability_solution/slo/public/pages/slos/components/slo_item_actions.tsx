/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiButtonIconProps,
  useEuiShadow,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import styled from 'styled-components';
import { RulesParams } from '@kbn/observability-plugin/public';
import { rulesLocatorID } from '@kbn/observability-plugin/common';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { BurnRateRuleParams } from '../../../typings';
import { useKibana } from '../../../utils/kibana_react';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { useCapabilities } from '../../../hooks/use_capabilities';
import { paths } from '../../../../common/locators/paths';

interface Props {
  slo: SLOWithSummaryResponse;
  isActionsPopoverOpen: boolean;
  setIsActionsPopoverOpen: (value: boolean) => void;
  setDeleteConfirmationModalOpen: (value: boolean) => void;
  setIsAddRuleFlyoutOpen: (value: boolean) => void;
  setIsEditRuleFlyoutOpen: (value: boolean) => void;
  setDashboardAttachmentReady?: (value: boolean) => void;
  btnProps?: Partial<EuiButtonIconProps>;
  rules?: Array<Rule<BurnRateRuleParams>>;
}
const CustomShadowPanel = styled(EuiPanel)<{ shadow: string }>`
  ${(props) => props.shadow}
`;

function IconPanel({ children, hasPanel }: { children: JSX.Element; hasPanel: boolean }) {
  const shadow = useEuiShadow('s');
  if (!hasPanel) return children;
  return (
    <CustomShadowPanel
      color="plain"
      element="button"
      grow={false}
      paddingSize="none"
      hasShadow={false}
      shadow={shadow}
    >
      {children}
    </CustomShadowPanel>
  );
}

export function SloItemActions({
  slo,
  rules,
  isActionsPopoverOpen,
  setIsActionsPopoverOpen,
  setIsAddRuleFlyoutOpen,
  setIsEditRuleFlyoutOpen,
  setDeleteConfirmationModalOpen,
  setDashboardAttachmentReady,
  btnProps,
}: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    share: {
      url: { locators },
    },
    executionContext,
  } = useKibana().services;
  const executionContextName = executionContext.get().name;
  const isDashboardContext = executionContextName === 'dashboards';
  const { hasWriteCapabilities } = useCapabilities();

  const sloDetailsUrl = basePath.prepend(
    paths.sloDetails(
      slo.id,
      ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined
    )
  );

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleViewDetails = () => {
    navigateToUrl(sloDetailsUrl);
  };

  const handleEdit = () => {
    navigateToUrl(basePath.prepend(paths.sloEdit(slo.id)));
  };

  const navigateToClone = useCloneSlo();

  const handleClone = () => {
    navigateToClone(slo);
  };

  const handleNavigateToRules = async () => {
    if (rules?.length === 1) {
      // if there is only one rule we can edit inline in flyout
      setIsEditRuleFlyoutOpen(true);
      setIsActionsPopoverOpen(false);
    } else {
      const locator = locators.get<RulesParams>(rulesLocatorID);
      locator?.navigate({ params: { sloId: slo.id } }, { replace: false });
    }
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsActionsPopoverOpen(false);
  };

  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

  const handleAddToDashboard = () => {
    setIsActionsPopoverOpen(false);
    if (setDashboardAttachmentReady) {
      setDashboardAttachmentReady(true);
    }
  };

  const btn = (
    <EuiButtonIcon
      data-test-subj="o11ySloListItemButton"
      aria-label={i18n.translate('xpack.slo.item.actions.button', {
        defaultMessage: 'Actions',
      })}
      color="text"
      disabled={!slo.summary}
      display="empty"
      iconType="boxesVertical"
      size="s"
      onClick={handleClickActions}
      {...btnProps}
    />
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={btnProps ? <IconPanel hasPanel={true}>{btn}</IconPanel> : btn}
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
            {i18n.translate('xpack.slo.item.actions.details', {
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
            {i18n.translate('xpack.slo.item.actions.edit', {
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
            {i18n.translate('xpack.slo.item.actions.createRule', {
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
            {i18n.translate('xpack.slo.item.actions.manageBurnRateRules', {
              defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
              values: { count: rules?.length ?? 0 },
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="clone"
            disabled={!hasWriteCapabilities}
            icon="copy"
            onClick={handleClone}
            data-test-subj="sloActionsClone"
          >
            {i18n.translate('xpack.slo.item.actions.clone', { defaultMessage: 'Clone' })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            disabled={!hasWriteCapabilities}
            onClick={handleDelete}
            data-test-subj="sloActionsDelete"
          >
            {i18n.translate('xpack.slo.item.actions.delete', { defaultMessage: 'Delete' })}
          </EuiContextMenuItem>,
        ].concat(
          !isDashboardContext ? (
            <EuiContextMenuItem
              icon="dashboardApp"
              key="addToDashboard"
              onClick={handleAddToDashboard}
              data-test-subj="sloActionsAddToDashboard"
            >
              {i18n.translate('xpack.slo.item.actions.addToDashboard', {
                defaultMessage: 'Add to Dashboard',
              })}
            </EuiContextMenuItem>
          ) : (
            []
          )
        )}
      />
    </EuiPopover>
  );
}
