/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  useEuiShadow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import styled from 'styled-components';
import { useCapabilities } from '../../../hooks/use_capabilities';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { BurnRateRuleParams } from '../../../typings';
import { useKibana } from '../../../utils/kibana_react';
import { useSloActions } from '../../slo_details/hooks/use_slo_actions';

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
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();
  const navigateToClone = useCloneSlo();

  // TODO Kevin: Should we make useSloActions consistent? Either return an URL for all actions, or return directly the handlers.
  const { handleNavigateToRules, sloEditUrl, remoteDeleteUrl, sloDetailsUrl } = useSloActions({
    slo,
    rules,
    setIsEditRuleFlyoutOpen,
    setIsActionsPopoverOpen,
  });

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleViewDetails = () => {
    navigateToUrl(sloDetailsUrl);
  };

  const handleClone = () => {
    navigateToClone(slo);
  };

  const handleDelete = () => {
    if (!!remoteDeleteUrl) {
      window.open(remoteDeleteUrl, '_blank');
    } else {
      setDeleteConfirmationModalOpen(true);
      setIsActionsPopoverOpen(false);
    }
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

  // TODO Kevin: Should we centralize this business logic to avoid scattering the same logic everywhere?
  const isRemote = !!slo.remote;
  const hasUndefinedRemoteKibanaUrl = !!slo.remote && slo.remote.kibanaUrl === '';

  const showRemoteLinkIcon = isRemote ? (
    <EuiIcon
      type="popout"
      size="s"
      css={{
        marginLeft: '10px',
      }}
    />
  ) : null;

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
            disabled={!hasWriteCapabilities || hasUndefinedRemoteKibanaUrl}
            href={sloEditUrl}
            target={isRemote ? '_blank' : undefined}
            toolTipContent={
              hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
            }
            data-test-subj="sloActionsEdit"
          >
            {i18n.translate('xpack.slo.item.actions.edit', {
              defaultMessage: 'Edit',
            })}
            {showRemoteLinkIcon}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="createRule"
            icon="bell"
            disabled={!hasWriteCapabilities || isRemote}
            onClick={handleCreateRule}
            data-test-subj="sloActionsCreateRule"
            toolTipContent={isRemote ? NOT_AVAILABLE_FOR_REMOTE : ''}
          >
            {i18n.translate('xpack.slo.item.actions.createRule', {
              defaultMessage: 'Create new alert rule',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="manageRules"
            icon="gear"
            disabled={!hasWriteCapabilities || hasUndefinedRemoteKibanaUrl}
            onClick={handleNavigateToRules}
            data-test-subj="sloActionsManageRules"
            toolTipContent={
              hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
            }
          >
            {i18n.translate('xpack.slo.item.actions.manageBurnRateRules', {
              defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
              values: { count: rules?.length ?? 0 },
            })}
            {showRemoteLinkIcon}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="clone"
            disabled={!hasWriteCapabilities || hasUndefinedRemoteKibanaUrl}
            icon="copy"
            onClick={handleClone}
            data-test-subj="sloActionsClone"
            toolTipContent={
              hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
            }
          >
            {i18n.translate('xpack.slo.item.actions.clone', { defaultMessage: 'Clone' })}
            {showRemoteLinkIcon}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            disabled={!hasWriteCapabilities || hasUndefinedRemoteKibanaUrl}
            onClick={handleDelete}
            toolTipContent={
              hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
            }
            data-test-subj="sloActionsDelete"
          >
            {i18n.translate('xpack.slo.item.actions.delete', { defaultMessage: 'Delete' })}
            {showRemoteLinkIcon}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="dashboardApp"
            key="addToDashboard"
            onClick={handleAddToDashboard}
            disabled={!hasWriteCapabilities}
            data-test-subj="sloActionsAddToDashboard"
          >
            {i18n.translate('xpack.slo.item.actions.addToDashboard', {
              defaultMessage: 'Add to Dashboard',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}

const NOT_AVAILABLE_FOR_REMOTE = i18n.translate('xpack.slo.item.actions.notAvailable', {
  defaultMessage: 'This action is not available for remote SLOs',
});

const NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL = i18n.translate(
  'xpack.slo.item.actions.remoteKibanaUrlUndefined',
  {
    defaultMessage: 'This action is not available for remote SLOs with undefined kibanaUrl',
  }
);
