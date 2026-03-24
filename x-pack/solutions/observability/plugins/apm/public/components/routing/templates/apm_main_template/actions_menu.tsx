/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { APM_SLO_INDICATOR_TYPES } from '../../../../../common/slo_indicator_types';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useServiceName } from '../../../../hooks/use_service_name';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { AlertingFlyout } from '../../../alerting/ui_components/alerting_flyout';
import type { ActionGroups } from '../../../shared/actions_context_menu';
import { ActionsContextMenu } from '../../../shared/actions_context_menu';

const actionsLabel = i18n.translate('xpack.apm.home.actionsMenu.actions', {
  defaultMessage: 'Actions',
});

export function ActionsMenu() {
  const { slo: sloPlugin } = useKibana<ApmPluginStartDeps>().services;
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { query } = useApmParams('/*');

  const [ruleType, setRuleType] = useState<ApmRuleType | null>(null);
  const [sloFlyoutState, setSloFlyoutState] = useState<{
    isOpen: boolean;
    indicatorType: ApmIndicatorType | null;
  }>({
    isOpen: false,
    indicatorType: null,
  });

  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const { isAlertingAvailable, canSaveAlerts } = getAlertingCapabilities(plugins, capabilities);
  const canSaveApmAlerts = !!capabilities.apm.save && canSaveAlerts;
  const canReadSlos = !!capabilities.slo?.read;
  const canWriteSlos = !!capabilities.slo?.write;

  const serviceName = useServiceName();
  const apmEnvironment = ('environment' in query && query.environment) || ENVIRONMENT_ALL.value;
  const sloEnvironment = apmEnvironment === ENVIRONMENT_ALL.value ? ALL_VALUE : apmEnvironment;
  const manageSlosUrl = useManageSlosUrl();

  const openSloFlyout = useCallback((indicatorType: ApmIndicatorType) => {
    setSloFlyoutState({ isOpen: true, indicatorType });
  }, []);

  const closeSloFlyout = useCallback(() => {
    setSloFlyoutState({ isOpen: false, indicatorType: null });
  }, []);

  const actionGroups: ActionGroups = useMemo(() => {
    const groups: ActionGroups = [];

    if (isAlertingAvailable && canSaveApmAlerts) {
      groups.push({
        id: 'alerts',
        groupLabel: i18n.translate('xpack.apm.home.actionsMenu.alertsGroup', {
          defaultMessage: 'Alerts',
        }),
        actions: [
          {
            id: 'createThresholdRule',
            name: i18n.translate('xpack.apm.home.actionsMenu.createThresholdRule', {
              defaultMessage: 'Create threshold rule',
            }),
            items: [
              {
                id: 'createLatencyRule',
                name: i18n.translate('xpack.apm.home.actionsMenu.latency', {
                  defaultMessage: 'Latency',
                }),
                onClick: () => setRuleType(ApmRuleType.TransactionDuration),
              },
              {
                id: 'createFailedTransactionRateRule',
                name: i18n.translate('xpack.apm.home.actionsMenu.failedTransactionRate', {
                  defaultMessage: 'Failed transaction rate',
                }),
                onClick: () => setRuleType(ApmRuleType.TransactionErrorRate),
              },
            ],
          },
          ...(canReadMlJobs
            ? [
                {
                  id: 'createAnomalyRule',
                  name: i18n.translate('xpack.apm.home.actionsMenu.createAnomalyRule', {
                    defaultMessage: 'Create anomaly rule',
                  }),
                  onClick: () => setRuleType(ApmRuleType.Anomaly),
                },
              ]
            : []),
          {
            id: 'createErrorCountRule',
            name: i18n.translate('xpack.apm.home.actionsMenu.createErrorCountRule', {
              defaultMessage: 'Create error count rule',
            }),
            onClick: () => setRuleType(ApmRuleType.ErrorCount),
          },
        ],
      });
    }

    if (canWriteSlos || canReadSlos) {
      groups.push({
        id: 'slos',
        groupLabel: i18n.translate('xpack.apm.home.actionsMenu.slosGroup', {
          defaultMessage: 'SLOs',
        }),
        actions: [
          ...(canWriteSlos
            ? [
                {
                  id: 'createLatencySlo',
                  name: i18n.translate('xpack.apm.home.actionsMenu.createLatencySlo', {
                    defaultMessage: 'Create APM latency SLO',
                  }),
                  onClick: () => openSloFlyout('sli.apm.transactionDuration'),
                },
                {
                  id: 'createAvailabilitySlo',
                  name: i18n.translate('xpack.apm.home.actionsMenu.createAvailabilitySlo', {
                    defaultMessage: 'Create APM availability SLO',
                  }),
                  onClick: () => openSloFlyout('sli.apm.transactionErrorRate'),
                },
              ]
            : []),
          ...(canReadSlos
            ? [
                {
                  id: 'manageSlos',
                  name: i18n.translate('xpack.apm.home.actionsMenu.manageSlos', {
                    defaultMessage: 'Manage SLOs',
                  }),
                  href: manageSlosUrl,
                  icon: 'tableOfContents',
                },
              ]
            : []),
        ],
      });
    }

    return groups;
  }, [
    isAlertingAvailable,
    canSaveApmAlerts,
    canReadMlJobs,
    canWriteSlos,
    canReadSlos,
    manageSlosUrl,
    openSloFlyout,
  ]);

  if (actionGroups.length === 0) {
    return null;
  }

  const CreateSloFlyout =
    sloFlyoutState.isOpen && sloFlyoutState.indicatorType
      ? sloPlugin?.getCreateSLOFormFlyout({
          initialValues: {
            ...(serviceName && { name: `APM SLO for ${serviceName}` }),
            indicator: {
              type: sloFlyoutState.indicatorType,
              params: {
                ...(serviceName && { service: serviceName }),
                environment: sloEnvironment,
              },
            },
          },
          onClose: closeSloFlyout,
          formSettings: {
            allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
          },
        })
      : null;

  return (
    <>
      <ActionsContextMenu
        id="actions-menu"
        actions={actionGroups}
        button={
          <EuiButton
            fill
            size="s"
            iconType="arrowDown"
            iconSide="right"
            data-test-subj="apmActionsMenuButton"
          >
            {actionsLabel}
          </EuiButton>
        }
      />
      <AlertingFlyout
        ruleType={ruleType}
        addFlyoutVisible={!!ruleType}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            setRuleType(null);
          }
        }}
      />
      {CreateSloFlyout}
    </>
  );
}
