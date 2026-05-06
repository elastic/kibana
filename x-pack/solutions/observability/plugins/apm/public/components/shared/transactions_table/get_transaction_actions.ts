/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import { useMemo } from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { ApmIndicatorType } from '../../../../common/slo_indicator_types';
import type { ServiceTransactionGroupItem } from './get_columns';
import type { TableActions } from '../managed_table';
import { getESQLQuery } from '../links/discover_links/get_esql_query';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAlertSloActions } from '../../../hooks/use_alert_slo_actions';
import { getManageSlosUrl } from '../../../hooks/use_manage_slos_url';

interface UseTransactionActionsParams {
  kuery: string;
  serviceName: string;
  environment: string;
  rangeFrom: string;
  rangeTo: string;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
  openAlertFlyout: (ruleType: ApmRuleType, transactionName: string) => void;
  openSloFlyout: (indicatorType: ApmIndicatorType, transactionName: string) => void;
}

export function useTransactionActions({
  kuery,
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
  indexSettings,
  openAlertFlyout,
  openSloFlyout,
}: UseTransactionActionsParams): TableActions<ServiceTransactionGroupItem> {
  const { share } = useApmPluginContext();
  const { getAlertActionGroup, getSloActionGroup, sloListLocator } = useAlertSloActions();

  return useMemo(() => {
    const discoverLocator = share?.url?.locators?.get(DISCOVER_APP_LOCATOR);
    const actionsList: TableActions<ServiceTransactionGroupItem> = [];

    actionsList.push({
      id: 'discover',
      actions: [
        {
          id: 'transactionsTable-openInDiscover',
          name: i18n.translate('xpack.apm.transactionsTable.openTracesInDiscover', {
            defaultMessage: 'Open traces in Discover',
          }),
          href: (item) => {
            const esqlQuery = getESQLQuery({
              indexType: 'traces',
              params: {
                kuery,
                serviceName,
                environment,
                transactionName: item.name,
                transactionType: item.transactionType,
                sortDirection: 'DESC',
              },
              indexSettings,
            });

            if (!esqlQuery) return undefined;

            return discoverLocator?.getRedirectUrl({
              timeRange: { from: rangeFrom, to: rangeTo },
              query: { esql: esqlQuery },
            });
          },
        },
      ],
    });

    const alertGroup = getAlertActionGroup<ServiceTransactionGroupItem>({
      onAlertClick: (item, ruleType) => openAlertFlyout(ruleType, item.name),
      showAnomalyRule: false,
    });
    if (alertGroup) {
      actionsList.push(alertGroup);
    }

    const sloGroup = getSloActionGroup<ServiceTransactionGroupItem>({
      onSloClick: (item, indicatorType) => openSloFlyout(indicatorType, item.name),
      getManageSlosHref: sloListLocator
        ? () => getManageSlosUrl(sloListLocator, { serviceName })
        : undefined,
    });
    if (sloGroup) {
      actionsList.push(sloGroup);
    }

    return actionsList;
  }, [
    share,
    indexSettings,
    kuery,
    serviceName,
    environment,
    rangeFrom,
    rangeTo,
    openAlertFlyout,
    openSloFlyout,
    getAlertActionGroup,
    getSloActionGroup,
    sloListLocator,
  ]);
}
