/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ApmRuleType } from '@kbn/rule-data-utils';
import rison from '@kbn/rison';
import { useMemo } from 'react';
import type { ServiceListItem } from '../../../../../common/service_inventory';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import type { TableActions } from '../../../shared/managed_table';

interface UseServiceActionsParams {
  openAlertFlyout: (ruleType: ApmRuleType, serviceName: string) => void;
  openSloFlyout: (indicatorType: ApmIndicatorType, serviceName: string) => void;
}

interface UseServiceActionsReturn {
  actions: TableActions<ServiceListItem>;
  showActionsColumn: boolean;
}

export function useServiceActions({
  openAlertFlyout,
  openSloFlyout,
}: UseServiceActionsParams): UseServiceActionsReturn {
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;

  const { canSaveAlerts } = getAlertingCapabilities(plugins, capabilities);
  const canSaveApmAlerts = !!(capabilities.apm.save && canSaveAlerts);
  const canWriteSlos = !!capabilities.slo?.write;
  const showActionsColumn = canSaveApmAlerts || canWriteSlos;

  const actions = useMemo(() => {
    const actionsList: TableActions<ServiceListItem> = [];

    if (canSaveApmAlerts) {
      actionsList.push({
        id: 'alerts',
        groupLabel: i18n.translate('xpack.apm.servicesTable.actions.alertsGroupLabel', {
          defaultMessage: 'Alerts',
        }),
        actions: [
          {
            id: 'createThresholdRule',
            name: i18n.translate('xpack.apm.servicesTable.actions.createThresholdRule', {
              defaultMessage: 'Create threshold rule',
            }),
            items: [
              {
                id: 'createLatencyRule',
                name: i18n.translate('xpack.apm.servicesTable.actions.createLatencyRule', {
                  defaultMessage: 'Latency',
                }),
                onClick: (item) => {
                  openAlertFlyout(ApmRuleType.TransactionDuration, item.serviceName);
                },
              },
              {
                id: 'createFailedTransactionRateRule',
                name: i18n.translate(
                  'xpack.apm.servicesTable.actions.createFailedTransactionRateRule',
                  {
                    defaultMessage: 'Failed transaction rate',
                  }
                ),
                onClick: (item) => {
                  openAlertFlyout(ApmRuleType.TransactionErrorRate, item.serviceName);
                },
              },
            ],
          },
          {
            id: 'createAnomalyRule',
            name: i18n.translate('xpack.apm.servicesTable.actions.createAnomalyRule', {
              defaultMessage: 'Create anomaly rule',
            }),
            onClick: (item) => {
              openAlertFlyout(ApmRuleType.Anomaly, item.serviceName);
            },
          },
          {
            id: 'createErrorCountRule',
            name: i18n.translate('xpack.apm.servicesTable.actions.createErrorCountRule', {
              defaultMessage: 'Create error count rule',
            }),
            onClick: (item) => {
              openAlertFlyout(ApmRuleType.ErrorCount, item.serviceName);
            },
          },
          {
            id: 'manageRules',
            name: i18n.translate('xpack.apm.servicesTable.actions.manageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'tableOfContents',
            onClick: (item) => {
              const { basePath } = core.http;
              const rulesUrl = basePath.prepend(
                `/app/observability/alerts/rules?_a=${rison.encode({
                  search: `service.name:${item.serviceName}`,
                  type: [
                    'apm.anomaly',
                    'apm.error_rate',
                    'apm.transaction_error_rate',
                    'apm.transaction_duration',
                  ],
                })}`
              );
              window.location.href = rulesUrl;
            },
          },
        ],
      });
    }

    if (canWriteSlos) {
      actionsList.push({
        id: 'slos',
        groupLabel: i18n.translate('xpack.apm.servicesTable.actions.slosGroupLabel', {
          defaultMessage: 'SLOs',
        }),
        actions: [
          {
            id: 'createLatencySlo',
            name: i18n.translate('xpack.apm.servicesTable.actions.createLatencySlo', {
              defaultMessage: 'Create APM latency SLO',
            }),
            onClick: (item) => {
              openSloFlyout('sli.apm.transactionDuration', item.serviceName);
            },
          },
          {
            id: 'createAvailabilitySlo',
            name: i18n.translate('xpack.apm.servicesTable.actions.createAvailabilitySlo', {
              defaultMessage: 'Create APM availability SLO',
            }),
            onClick: (item) => {
              openSloFlyout('sli.apm.transactionErrorRate', item.serviceName);
            },
          },
          {
            id: 'manageSlos',
            name: i18n.translate('xpack.apm.servicesTable.actions.manageSlos', {
              defaultMessage: 'Manage SLOs',
            }),
            icon: 'tableOfContents',
            onClick: (item) => {
              const { basePath } = core.http;
              const slosUrl = basePath.prepend(
                `/app/slos?search=${rison.encode({
                  filters: [
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        key: 'service.name',
                        negate: false,
                        params: { query: item.serviceName },
                        type: 'phrase',
                      },
                      query: {
                        match_phrase: { 'service.name': item.serviceName },
                      },
                    },
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        key: 'slo.indicator.type',
                        negate: false,
                        params: ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
                        type: 'phrases',
                      },
                      query: {
                        bool: {
                          minimum_should_match: 1,
                          should: [
                            {
                              match_phrase: {
                                'slo.indicator.type': 'sli.apm.transactionDuration',
                              },
                            },
                            {
                              match_phrase: {
                                'slo.indicator.type': 'sli.apm.transactionErrorRate',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                })}`
              );
              window.location.href = slosUrl;
            },
          },
        ],
      });
    }

    return actionsList;
  }, [openAlertFlyout, openSloFlyout, core.http, canSaveApmAlerts, canWriteSlos]);

  return { actions, showActionsColumn };
}
