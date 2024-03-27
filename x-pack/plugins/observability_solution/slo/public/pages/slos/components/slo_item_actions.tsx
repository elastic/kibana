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
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import styled from 'styled-components';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { isEmpty } from 'lodash';
import { BurnRateRuleParams } from '../../../typings';
import { useSloActions } from '../../slo_details/hooks/use_slo_actions';
import { useKibana } from '../../../utils/kibana_react';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { useCapabilities } from '../../../hooks/use_capabilities';

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

  const { handleNavigateToRules, editSloHref, remoteDeleteUrl, sloDetailsUrl } = useSloActions({
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

  const navigateToClone = useCloneSlo(slo.kibanaUrl);

  const handleClone = () => {
    navigateToClone(slo);
  };

  const handleDelete = () => {
    if (slo.kibanaUrl) {
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
  const isRemote = !!slo.remoteName;

  const showPopUpIcon = slo.kibanaUrl ? (
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
            disabled={!hasWriteCapabilities || (isRemote && !slo.kibanaUrl)}
            href={editSloHref()}
            target={slo.kibanaUrl ? '_blank' : undefined}
            data-test-subj="sloActionsEdit"
          >
            {i18n.translate('xpack.slo.item.actions.edit', {
              defaultMessage: 'Edit',
            })}
            {showPopUpIcon}
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
            disabled={!hasWriteCapabilities}
            onClick={handleNavigateToRules}
            data-test-subj="sloActionsManageRules"
          >
            {i18n.translate('xpack.slo.item.actions.manageBurnRateRules', {
              defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
              values: { count: rules?.length ?? 0 },
            })}
            {showPopUpIcon}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="clone"
            disabled={!hasWriteCapabilities || (isRemote && isEmpty(slo.indicator.params))}
            icon="copy"
            onClick={handleClone}
            data-test-subj="sloActionsClone"
            toolTipContent={
              isRemote && isEmpty(slo.indicator.params) ? NOT_AVAILABLE_FOR_REMOTE : ''
            }
          >
            {i18n.translate('xpack.slo.item.actions.clone', { defaultMessage: 'Clone' })}
            {showPopUpIcon}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            disabled={!hasWriteCapabilities}
            onClick={handleDelete}
            data-test-subj="sloActionsDelete"
          >
            {i18n.translate('xpack.slo.item.actions.delete', { defaultMessage: 'Delete' })}
            {showPopUpIcon}
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
