/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useCallback, useEffect, useState } from 'react';
import { paths } from '../../../../common/locators/paths';
import { SloDeleteModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloResetConfirmationModal } from '../../../components/slo/reset_confirmation_modal/slo_reset_confirmation_modal';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { usePermissions } from '../../../hooks/use_permissions';
import { useResetSlo } from '../../../hooks/use_reset_slo';
import { useKibana } from '../../../utils/kibana_react';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { isApmIndicatorType } from '../../../utils/slo/indicator';
import { EditBurnRateRuleFlyout } from '../../slos/components/common/edit_burn_rate_rule_flyout';
import { useGetQueryParams } from '../hooks/use_get_query_params';
import { useSloActions } from '../hooks/use_slo_actions';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
}

export function HeaderControl({ isLoading, slo }: Props) {
  const {
    application: { navigateToUrl, capabilities },
    http: { basePath },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const hasApmReadCapabilities = capabilities.apm.show;
  const { data: permissions } = usePermissions();

  const { isDeletingSlo, isResettingSlo, removeDeleteQueryParam, removeResetQueryParam } =
    useGetQueryParams();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRuleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);
  const [isEditRuleFlyoutOpen, setIsEditRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);
  const [isResetConfirmationModalOpen, setResetConfirmationModalOpen] = useState(false);

  const { mutateAsync: resetSlo, isLoading: isResetLoading } = useResetSlo();

  const { data: rulesBySlo, refetchRules } = useFetchRulesForSlo({
    sloIds: slo ? [slo.id] : undefined,
  });

  const rules = slo ? rulesBySlo?.[slo?.id] ?? [] : [];

  const handleActionsClick = () => setIsPopoverOpen((value) => !value);
  const closePopover = () => setIsPopoverOpen(false);

  useEffect(() => {
    if (isDeletingSlo) {
      setDeleteConfirmationModalOpen(true);
    }
    if (isResettingSlo) {
      setResetConfirmationModalOpen(true);
    }
  }, [isDeletingSlo, isResettingSlo]);

  const onCloseRuleFlyout = () => {
    setRuleFlyoutVisibility(false);
  };

  const handleOpenRuleFlyout = () => {
    closePopover();
    setRuleFlyoutVisibility(true);
  };

  const { handleNavigateToRules, sloEditUrl, remoteDeleteUrl, remoteResetUrl } = useSloActions({
    slo,
    rules,
    setIsEditRuleFlyoutOpen,
    setIsActionsPopoverOpen: setIsPopoverOpen,
  });

  const handleNavigateToApm = () => {
    if (!slo) {
      return undefined;
    }

    const url = convertSliApmParamsToApmAppDeeplinkUrl(slo);
    if (url) {
      navigateToUrl(basePath.prepend(url));
    }
  };

  const navigateToClone = useCloneSlo();

  const handleClone = async () => {
    if (slo) {
      setIsPopoverOpen(false);
      navigateToClone(slo);
    }
  };

  const handleDelete = () => {
    if (!!remoteDeleteUrl) {
      window.open(remoteDeleteUrl, '_blank');
    } else {
      setDeleteConfirmationModalOpen(true);
      setIsPopoverOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    removeDeleteQueryParam();
    setDeleteConfirmationModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    removeDeleteQueryParam();
    setDeleteConfirmationModalOpen(false);
    navigate(basePath.prepend(paths.slos));
  };

  const handleReset = () => {
    if (!!remoteResetUrl) {
      window.open(remoteResetUrl, '_blank');
    } else {
      setResetConfirmationModalOpen(true);
    }
  };

  const handleResetConfirm = async () => {
    if (slo) {
      await resetSlo({ id: slo.id, name: slo.name });
      removeResetQueryParam();
      setResetConfirmationModalOpen(false);
    }
  };

  const handleResetCancel = () => {
    removeResetQueryParam();
    setResetConfirmationModalOpen(false);
  };

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  const isRemote = !!slo?.remote;
  const hasUndefinedRemoteKibanaUrl = !!slo?.remote && slo?.remote?.kibanaUrl === '';

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
    <>
      <EuiPopover
        data-test-subj="sloDetailsHeaderControlPopover"
        button={
          <EuiButton
            data-test-subj="o11yHeaderControlActionsButton"
            fill
            iconSide="right"
            iconType="arrowDown"
            iconSize="s"
            onClick={handleActionsClick}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {i18n.translate('xpack.slo.sloDetails.headerControl.actions', {
              defaultMessage: 'Actions',
            })}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
        <EuiContextMenuPanel
          size="m"
          items={[
            <EuiContextMenuItem
              key="edit"
              disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
              icon="pencil"
              href={sloEditUrl}
              target={isRemote ? '_blank' : undefined}
              toolTipContent={
                hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
              }
              data-test-subj="sloDetailsHeaderControlPopoverEdit"
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.edit', {
                defaultMessage: 'Edit',
              })}
              {showRemoteLinkIcon}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="createBurnRateRule"
              disabled={!permissions?.hasAllWriteRequested || isRemote}
              icon="bell"
              onClick={handleOpenRuleFlyout}
              data-test-subj="sloDetailsHeaderControlPopoverCreateRule"
              toolTipContent={isRemote ? NOT_AVAILABLE_FOR_REMOTE : ''}
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.createBurnRateRule', {
                defaultMessage: 'Create new alert rule',
              })}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="manageRules"
              disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
              icon="gear"
              onClick={handleNavigateToRules}
              data-test-subj="sloDetailsHeaderControlPopoverManageRules"
              toolTipContent={
                hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
              }
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.manageRules', {
                defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
                values: { count: rules.length },
              })}
              {showRemoteLinkIcon}
            </EuiContextMenuItem>,
          ]
            .concat(
              !!slo && isApmIndicatorType(slo.indicator) ? (
                <EuiContextMenuItem
                  key="exploreInApm"
                  icon="bullseye"
                  disabled={!hasApmReadCapabilities || isRemote}
                  onClick={handleNavigateToApm}
                  data-test-subj="sloDetailsHeaderControlPopoverExploreInApm"
                  toolTipContent={isRemote ? NOT_AVAILABLE_FOR_REMOTE : ''}
                >
                  {i18n.translate('xpack.slo.sloDetails.headerControl.exploreInApm', {
                    defaultMessage: 'Service details',
                  })}
                </EuiContextMenuItem>
              ) : (
                []
              )
            )
            .concat(
              <EuiContextMenuItem
                key="clone"
                disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                icon="copy"
                onClick={handleClone}
                data-test-subj="sloDetailsHeaderControlPopoverClone"
                toolTipContent={
                  hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                }
              >
                {i18n.translate('xpack.slo.slo.item.actions.clone', {
                  defaultMessage: 'Clone',
                })}
                {showRemoteLinkIcon}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon="trash"
                disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                onClick={handleDelete}
                data-test-subj="sloDetailsHeaderControlPopoverDelete"
                toolTipContent={
                  hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                }
              >
                {i18n.translate('xpack.slo.slo.item.actions.delete', {
                  defaultMessage: 'Delete',
                })}
                {showRemoteLinkIcon}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="reset"
                icon="refresh"
                disabled={!permissions?.hasAllWriteRequested || hasUndefinedRemoteKibanaUrl}
                onClick={handleReset}
                data-test-subj="sloDetailsHeaderControlPopoverReset"
                toolTipContent={
                  hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : ''
                }
              >
                {i18n.translate('xpack.slo.slo.item.actions.reset', {
                  defaultMessage: 'Reset',
                })}
                {showRemoteLinkIcon}
              </EuiContextMenuItem>
            )}
        />
      </EuiPopover>
      <EditBurnRateRuleFlyout
        rule={rules?.[0]}
        isEditRuleFlyoutOpen={isEditRuleFlyoutOpen}
        setIsEditRuleFlyoutOpen={setIsEditRuleFlyoutOpen}
        refetchRules={refetchRules}
      />

      {slo && isRuleFlyoutVisible ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          canChangeTrigger={false}
          onClose={onCloseRuleFlyout}
          initialValues={{ name: `${slo.name} burn rate`, params: { sloId: slo.id } }}
          useRuleProducer
        />
      ) : null}

      {slo && isDeleteConfirmationModalOpen ? (
        <SloDeleteModal slo={slo} onCancel={handleDeleteCancel} onSuccess={handleDeleteConfirm} />
      ) : null}

      {slo && isResetConfirmationModalOpen ? (
        <SloResetConfirmationModal
          slo={slo}
          onCancel={handleResetCancel}
          onConfirm={handleResetConfirm}
          isLoading={isResetLoading}
        />
      ) : null}
    </>
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
