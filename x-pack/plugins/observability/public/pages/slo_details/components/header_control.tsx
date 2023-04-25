/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { useCapabilities } from '../../../hooks/slo/use_capabilities';
import { useKibana } from '../../../utils/kibana_react';
import { isApmIndicatorType } from '../../../utils/slo/indicator';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { SLO_BURN_RATE_RULE_ID } from '../../../../common/constants';
import { rulesLocatorID, sloFeatureId } from '../../../../common';
import { paths } from '../../../config/paths';
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

  const handleActionsClick = () => setIsPopoverOpen((value) => !value);
  const closePopover = () => setIsPopoverOpen(false);

  const handleEdit = () => {
    if (slo) {
      navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
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

    if (slo?.id) {
      locator?.navigate(
        {
          params: { sloId: slo?.id || '' },
        },
        {
          replace: true,
        }
      );
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

      navigateToUrl(basePath.prepend(url));
    }
  };

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
          size="s"
          items={[
            <EuiContextMenuItem
              key="edit"
              disabled={!hasWriteCapabilities}
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
              onClick={handleNavigateToRules}
              data-test-subj="sloDetailsHeaderControlPopoverManageRules"
            >
              {i18n.translate('xpack.observability.slo.sloDetails.headerControl.manageRules', {
                defaultMessage: 'Manage rules',
              })}
            </EuiContextMenuItem>,
          ].concat(
            !!slo && isApmIndicatorType(slo.indicator.type)
              ? [
                  <EuiContextMenuItem
                    key="exploreInApm"
                    onClick={handleNavigateToApm}
                    data-test-subj="sloDetailsHeaderControlPopoverExploreInApm"
                  >
                    {i18n.translate(
                      'xpack.observability.slos.sloDetails.headerControl.exploreInApm',
                      {
                        defaultMessage: 'Explore in APM',
                      }
                    )}
                  </EuiContextMenuItem>,
                ]
              : []
          )}
        />
      </EuiPopover>

      {!!slo && isRuleFlyoutVisible ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          ruleTypeId={SLO_BURN_RATE_RULE_ID}
          canChangeTrigger={false}
          onClose={onCloseRuleFlyout}
          initialValues={{ name: `${slo.name} burn rate`, params: { sloId: slo.id } }}
        />
      ) : null}
    </>
  );
}
