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
import { useCloneSlo } from '../../../hooks/slo/use_clone_slo';
import { useCapabilities } from '../../../hooks/slo/use_capabilities';
import { useKibana } from '../../../utils/kibana_react';
import { paths } from '../../../../common/locators/paths';
import { RulesParams } from '../../../locators/rules';
import { rulesLocatorID } from '../../../../common';

interface Props {
  slo: SLOWithSummaryResponse;
  isActionsPopoverOpen: boolean;
  setIsActionsPopoverOpen: (value: boolean) => void;
  setDeleteConfirmationModalOpen: (value: boolean) => void;
  setIsAddRuleFlyoutOpen: (value: boolean) => void;
  setDashboardAttachmentReady?: (value: boolean) => void;
  btnProps?: Partial<EuiButtonIconProps>;
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
  isActionsPopoverOpen,
  setIsActionsPopoverOpen,
  setIsAddRuleFlyoutOpen,
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
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();

  const sloDetailsUrl = basePath.prepend(
    paths.observability.sloDetails(
      slo.id,
      slo.groupBy !== ALL_VALUE && slo.instanceId ? slo.instanceId : undefined
    )
  );

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleViewDetails = () => {
    navigateToUrl(sloDetailsUrl);
  };

  const handleEdit = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
  };

  const navigateToClone = useCloneSlo();

  const handleClone = () => {
    navigateToClone(slo);
  };

  const handleNavigateToRules = async () => {
    const locator = locators.get<RulesParams>(rulesLocatorID);
    locator?.navigate({ params: { sloId: slo.id } }, { replace: false });
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsActionsPopoverOpen(false);
  };

  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

  const handleAttachToDashboard = () => {
    setIsActionsPopoverOpen(false);
    if (setDashboardAttachmentReady) {
      setDashboardAttachmentReady(true);
    }
  };

  const btn = (
    <EuiButtonIcon
      data-test-subj="o11ySloListItemButton"
      aria-label={i18n.translate('xpack.observability.slo.item.actions.button', {
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
            {i18n.translate('xpack.observability.slo.item.actions.details', {
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
            {i18n.translate('xpack.observability.slo.item.actions.edit', {
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
            {i18n.translate('xpack.observability.slo.item.actions.createRule', {
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
            {i18n.translate('xpack.observability.slo.item.actions.manageRules', {
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
            {i18n.translate('xpack.observability.slo.item.actions.clone', {
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
            {i18n.translate('xpack.observability.slo.item.actions.delete', {
              defaultMessage: 'Delete',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="dashboardApp"
            key="attachToDashboard"
            onClick={handleAttachToDashboard}
            data-test-subj="sloActinsAttachToDashboard"
          >
            {i18n.translate('xpack.observability.slo.item.actions.attachToDashboard', {
              defaultMessage: 'Attach to Dashboard',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
