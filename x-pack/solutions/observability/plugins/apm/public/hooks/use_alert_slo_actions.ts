/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { sloListLocatorID, type SloListLocatorParams } from '@kbn/deeplinks-observability';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { useCallback } from 'react';
import type { ApmIndicatorType } from '../../common/slo_indicator_types';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { getAlertingCapabilities } from '../components/alerting/utils/get_alerting_capabilities';
import type { TableAction, TableActionGroup } from '../components/shared/managed_table';

export type ApmFlyoutState =
  | { type: 'closed' }
  | { type: 'alert'; ruleType: ApmRuleType; transactionName?: string }
  | { type: 'slo'; indicatorType: ApmIndicatorType; transactionName?: string };

interface GetAlertActionGroupParams<T> {
  onAlertClick: (item: T, ruleType: ApmRuleType) => void;
  showAnomalyRule?: boolean;
}

interface GetSloActionGroupParams<T> {
  onSloClick: (item: T, indicatorType: ApmIndicatorType) => void;
  getManageSlosHref?: (item: T) => string | undefined;
}

function buildAlertActionGroup<T>(
  onAlertClick: ((item: T, ruleType: ApmRuleType) => void) | undefined,
  showAnomalyRule: boolean,
  manageRulesHref: string | undefined
): TableActionGroup<T> {
  const actions: Array<TableAction<T>> = [];

  if (onAlertClick) {
    actions.push(
      {
        id: 'createThresholdRule',
        name: i18n.translate('xpack.apm.actionGroups.createThresholdRule', {
          defaultMessage: 'Create threshold rule',
        }),
        items: [
          {
            id: 'createLatencyRule',
            name: i18n.translate('xpack.apm.actionGroups.latency', {
              defaultMessage: 'Latency',
            }),
            onClick: (item: T) => onAlertClick(item, ApmRuleType.TransactionDuration),
          },
          {
            id: 'createFailedTransactionRateRule',
            name: i18n.translate('xpack.apm.actionGroups.failedTransactionRate', {
              defaultMessage: 'Failed transaction rate',
            }),
            onClick: (item: T) => onAlertClick(item, ApmRuleType.TransactionErrorRate),
          },
        ],
      },
      ...(showAnomalyRule
        ? [
            {
              id: 'createAnomalyRule',
              name: i18n.translate('xpack.apm.actionGroups.createAnomalyRule', {
                defaultMessage: 'Create anomaly rule',
              }),
              onClick: (item: T) => onAlertClick(item, ApmRuleType.Anomaly),
            },
          ]
        : []),
      {
        id: 'createErrorCountRule',
        name: i18n.translate('xpack.apm.actionGroups.createErrorCountRule', {
          defaultMessage: 'Create error count rule',
        }),
        onClick: (item: T) => onAlertClick(item, ApmRuleType.ErrorCount),
      }
    );
  }

  if (manageRulesHref) {
    actions.push({
      id: 'manageRules',
      name: i18n.translate('xpack.apm.actionGroups.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      icon: 'tableOfContents',
      href: () => manageRulesHref,
    });
  }

  return {
    id: 'alerts',
    groupLabel: i18n.translate('xpack.apm.actionGroups.alertsGroupLabel', {
      defaultMessage: 'Alerts',
    }),
    actions,
  };
}

function buildSloActionGroup<T>(
  onSloClick: (item: T, indicatorType: ApmIndicatorType) => void,
  getManageSlosHref: ((item: T) => string | undefined) | undefined,
  canWriteSlos: boolean,
  canReadSlos: boolean,
  hasSloListLocator: boolean
): TableActionGroup<T> {
  const sloActions: Array<TableAction<T>> = [];

  if (canWriteSlos) {
    sloActions.push(
      {
        id: 'createLatencySlo',
        name: i18n.translate('xpack.apm.actionGroups.createLatencySlo', {
          defaultMessage: 'Create APM latency SLO',
        }),
        onClick: (item: T) => onSloClick(item, 'sli.apm.transactionDuration'),
      },
      {
        id: 'createAvailabilitySlo',
        name: i18n.translate('xpack.apm.actionGroups.createAvailabilitySlo', {
          defaultMessage: 'Create APM availability SLO',
        }),
        onClick: (item: T) => onSloClick(item, 'sli.apm.transactionErrorRate'),
      }
    );
  }

  if (canReadSlos && hasSloListLocator && getManageSlosHref) {
    sloActions.push({
      id: 'manageSlos',
      name: i18n.translate('xpack.apm.actionGroups.manageSlos', {
        defaultMessage: 'Manage SLOs',
      }),
      icon: 'tableOfContents',
      href: getManageSlosHref,
    });
  }

  return {
    id: 'slos',
    groupLabel: i18n.translate('xpack.apm.actionGroups.slosGroupLabel', {
      defaultMessage: 'SLOs',
    }),
    actions: sloActions,
  };
}

export function useAlertSloActions() {
  const { core, plugins, share } = useApmPluginContext();
  const { capabilities } = core.application;
  const sloListLocator = share?.url?.locators?.get<SloListLocatorParams>(sloListLocatorID);

  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const { isAlertingAvailable, canReadAlerts, canSaveAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );
  const canSaveApmAlerts = !!(capabilities.apm.save && canSaveAlerts);
  const canReadSlos = !!capabilities.slo?.read;
  const canWriteSlos = !!capabilities.slo?.write;
  const hasSloListLocator = !!sloListLocator;

  const { href: manageRulesHref } = plugins.observability.useRulesLink();

  const getAlertActionGroup = useCallback(
    <T>({
      onAlertClick,
      showAnomalyRule = canReadMlJobs,
    }: GetAlertActionGroupParams<T>): TableActionGroup<T> | null => {
      if (!isAlertingAvailable || (!canSaveApmAlerts && !canReadAlerts)) {
        return null;
      }
      return buildAlertActionGroup(
        canSaveApmAlerts ? onAlertClick : undefined,
        canSaveApmAlerts && showAnomalyRule,
        canReadAlerts ? manageRulesHref : undefined
      );
    },
    [isAlertingAvailable, canSaveApmAlerts, canReadMlJobs, canReadAlerts, manageRulesHref]
  );

  const getSloActionGroup = useCallback(
    <T>({
      onSloClick,
      getManageSlosHref,
    }: GetSloActionGroupParams<T>): TableActionGroup<T> | null => {
      if (!canWriteSlos && !canReadSlos) {
        return null;
      }
      return buildSloActionGroup(
        onSloClick,
        getManageSlosHref,
        canWriteSlos,
        canReadSlos,
        hasSloListLocator
      );
    },
    [canWriteSlos, canReadSlos, hasSloListLocator]
  );

  return { getAlertActionGroup, getSloActionGroup, sloListLocator };
}
