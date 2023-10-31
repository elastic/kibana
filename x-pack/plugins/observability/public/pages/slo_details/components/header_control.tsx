/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { SloDeleteConfirmationModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { useCapabilities } from '../../../hooks/slo/use_capabilities';
import { useKibana } from '../../../utils/kibana_react';
import { useCloneSlo } from '../../../hooks/slo/use_clone_slo';
import { useDeleteSlo } from '../../../hooks/slo/use_delete_slo';
import { isApmIndicatorType } from '../../../utils/slo/indicator';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../common/constants';
import { rulesLocatorID, sloFeatureId } from '../../../../common';
import { paths } from '../../../../common/locators/paths';
import {
  transformSloResponseToCreateSloForm,
  transformCreateSLOFormToCreateSLOInput,
} from '../../slo_edit/helpers/process_slo_form_values';
import type { RulesParams } from '../../../locators/rules';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
}

export function HeaderControl({ isLoading, slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    share: {
      url: { locators },
    },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRuleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const { mutate: cloneSlo } = useCloneSlo();
  const { mutate: deleteSlo } = useDeleteSlo();

  const handleActionsClick = () => setIsPopoverOpen((value) => !value);
  const closePopover = () => setIsPopoverOpen(false);

  const handleEdit = () => {
    if (slo) {
      navigate(basePath.prepend(paths.observability.sloEdit(slo.id)));
    }
  };

  const onCloseRuleFlyout = () => {
    setRuleFlyoutVisibility(false);
  };

  const handleOpenRuleFlyout = () => {
    closePopover();
    setRuleFlyoutVisibility(true);
  };

  const handleNavigateToRules = async () => {
    const locator = locators.get<RulesParams>(rulesLocatorID);

    if (slo?.id && locator) {
      locator.navigate({ params: { sloId: slo.id } }, { replace: false });
    }
  };

  const handleNavigateToApm = () => {
    if (
      slo?.indicator.type === 'sli.apm.transactionDuration' ||
      slo?.indicator.type === 'sli.apm.transactionErrorRate'
    ) {
      const {
        indicator: {
          params: { environment, filter, service, transactionName, transactionType },
        },
        timeWindow: { duration },
      } = slo;

      const url = convertSliApmParamsToApmAppDeeplinkUrl({
        duration,
        environment,
        filter,
        service,
        transactionName,
        transactionType,
      });

      navigate(basePath.prepend(url));
    }
  };

  const handleClone = async () => {
    if (slo) {
      setIsPopoverOpen(false);

      const newSlo = transformCreateSLOFormToCreateSLOInput(
        transformSloResponseToCreateSloForm({ ...slo, name: `[Copy] ${slo.name}` })!
      );

      cloneSlo({ slo: newSlo, originalSloId: slo.id });

      navigate(basePath.prepend(paths.observability.slos));
    }
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsPopoverOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (slo) {
      deleteSlo({ id: slo.id, name: slo.name });
      navigate(basePath.prepend(paths.observability.slos));
    }
  };

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

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
            disabled={isLoading || !slo}
          >
            {i18n.translate('xpack.observability.slo.sloDetails.headerControl.actions', {
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
              disabled={!hasWriteCapabilities}
              icon="pencil"
              onClick={handleEdit}
              data-test-subj="sloDetailsHeaderControlPopoverEdit"
            >
              {i18n.translate('xpack.observability.slo.sloDetails.headerControl.edit', {
                defaultMessage: 'Edit',
              })}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="createBurnRateRule"
              disabled={!hasWriteCapabilities}
              icon="bell"
              onClick={handleOpenRuleFlyout}
              data-test-subj="sloDetailsHeaderControlPopoverCreateRule"
            >
              {i18n.translate(
                'xpack.observability.slo.sloDetails.headerControl.createBurnRateRule',
                {
                  defaultMessage: 'Create new alert rule',
                }
              )}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="manageRules"
              disabled={!hasWriteCapabilities}
              icon="gear"
              onClick={handleNavigateToRules}
              data-test-subj="sloDetailsHeaderControlPopoverManageRules"
            >
              {i18n.translate('xpack.observability.slo.sloDetails.headerControl.manageRules', {
                defaultMessage: 'Manage rules',
              })}
            </EuiContextMenuItem>,
          ]
            .concat(
              !!slo && isApmIndicatorType(slo.indicator.type) ? (
                <EuiContextMenuItem
                  key="exploreInApm"
                  icon="bullseye"
                  onClick={handleNavigateToApm}
                  data-test-subj="sloDetailsHeaderControlPopoverExploreInApm"
                >
                  {i18n.translate(
                    'xpack.observability.slos.sloDetails.headerControl.exploreInApm',
                    {
                      defaultMessage: 'Service details',
                    }
                  )}
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
                {i18n.translate('xpack.observability.slo.slo.item.actions.clone', {
                  defaultMessage: 'Clone',
                })}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon="trash"
                disabled={!hasWriteCapabilities}
                onClick={handleDelete}
                data-test-subj="sloDetailsHeaderControlPopoverDelete"
              >
                {i18n.translate('xpack.observability.slo.slo.item.actions.delete', {
                  defaultMessage: 'Delete',
                })}
              </EuiContextMenuItem>
            )}
        />
      </EuiPopover>

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
