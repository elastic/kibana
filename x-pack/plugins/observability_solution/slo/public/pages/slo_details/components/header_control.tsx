/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useCallback, useEffect, useState } from 'react';

import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import { EditBurnRateRuleFlyout } from '../../slos/components/common/edit_burn_rate_rule_flyout';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { useSloActions } from '../hooks/use_slo_actions';
import { useKibana } from '../../../utils/kibana_react';
import { paths } from '../../../../common/locators/paths';
import { SloDeleteConfirmationModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { useCapabilities } from '../../../hooks/use_capabilities';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { useDeleteSlo } from '../../../hooks/use_delete_slo';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { isApmIndicatorType } from '../../../utils/slo/indicator';
import { useGetQueryParams } from '../hooks/use_get_query_params';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
}

// TODO Kevin: Refactor the need to check slo undefined. We can probably simplify everything here.
export function HeaderControl({ isLoading, slo }: Props) {
  const {
    application: { navigateToUrl, capabilities },
    http: { basePath },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;
  const hasApmReadCapabilities = capabilities.apm.show;
  const { hasWriteCapabilities } = useCapabilities();

  const { isDeletingSlo, removeDeleteQueryParam } = useGetQueryParams();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRuleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);
  const [isEditRuleFlyoutOpen, setIsEditRuleFlyoutOpen] = useState(false);

  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const { mutate: deleteSlo } = useDeleteSlo();

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
  }, [isDeletingSlo]);

  const onCloseRuleFlyout = () => {
    setRuleFlyoutVisibility(false);
  };

  const handleOpenRuleFlyout = () => {
    closePopover();
    setRuleFlyoutVisibility(true);
  };

  const { handleNavigateToRules, sloEditUrl } = useSloActions({
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
    setDeleteConfirmationModalOpen(true);
    setIsPopoverOpen(false);
  };

  const handleDeleteCancel = () => {
    removeDeleteQueryParam();
    setDeleteConfirmationModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (slo) {
      deleteSlo({ id: slo.id, name: slo.name });
      navigate(basePath.prepend(paths.slos));
    }
  };

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  // TODO Kevin: Should we centralize this business logic to avoid scattering the same logic everywhere?
  const isRemote = !!slo?.remote;
  const canEditRemote = Boolean(isRemote && slo?.remote?.kibanaUrl);

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
              disabled={!hasWriteCapabilities || !canEditRemote}
              icon="pencil"
              href={sloEditUrl}
              target={isRemote ? '_blank' : undefined}
              data-test-subj="sloDetailsHeaderControlPopoverEdit"
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.edit', {
                defaultMessage: 'Edit',
              })}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="createBurnRateRule"
              disabled={!hasWriteCapabilities || isRemote}
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
              disabled={!hasWriteCapabilities}
              icon="gear"
              onClick={handleNavigateToRules}
              data-test-subj="sloDetailsHeaderControlPopoverManageRules"
            >
              {i18n.translate('xpack.slo.sloDetails.headerControl.manageRules', {
                defaultMessage: 'Manage burn rate {count, plural, one {rule} other {rules}}',
                values: { count: rules.length },
              })}
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
                disabled={!hasWriteCapabilities}
                icon="copy"
                onClick={handleClone}
                data-test-subj="sloDetailsHeaderControlPopoverClone"
              >
                {i18n.translate('xpack.slo.slo.item.actions.clone', {
                  defaultMessage: 'Clone',
                })}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon="trash"
                disabled={!hasWriteCapabilities || isRemote}
                onClick={handleDelete}
                data-test-subj="sloDetailsHeaderControlPopoverDelete"
                toolTipContent={isRemote ? NOT_AVAILABLE_FOR_REMOTE : ''}
              >
                {i18n.translate('xpack.slo.slo.item.actions.delete', {
                  defaultMessage: 'Delete',
                })}
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
        <SloDeleteConfirmationModal
          slo={slo}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}

const NOT_AVAILABLE_FOR_REMOTE = i18n.translate('xpack.slo.item.actions.notAvailable', {
  defaultMessage: 'This action is not available for remote SLOs',
});
