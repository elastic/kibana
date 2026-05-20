/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import { useMemo } from 'react';
import type { ServiceListItem } from '../../../../../common/service_inventory';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { getManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useAlertSloActions } from '../../../../hooks/use_alert_slo_actions';
import type { TableActions } from '../../../shared/managed_table';
import type { IndexType } from '../../../shared/links/discover_links/get_esql_query';

interface UseServiceActionsParams {
  openAlertFlyout: (ruleType: ApmRuleType, serviceName: string) => void;
  openSloFlyout: (indicatorType: ApmIndicatorType, serviceName: string) => void;
  getDiscoverHref: (item: ServiceListItem, indexType: IndexType) => string | undefined;
}

export function useServiceActions({
  openAlertFlyout,
  openSloFlyout,
  getDiscoverHref,
}: UseServiceActionsParams): TableActions<ServiceListItem> {
  const { getAlertActionGroup, getSloActionGroup, sloListLocator } = useAlertSloActions();

  const actions = useMemo(() => {
    const actionsList: TableActions<ServiceListItem> = [];

    actionsList.push({
      id: 'discover',
      actions: [
        {
          id: 'servicesTable-openTracesInDiscover',
          name: i18n.translate('xpack.apm.servicesTable.actions.openTracesInDiscover', {
            defaultMessage: 'Open traces in Discover',
          }),
          href: (item) => getDiscoverHref(item, 'traces'),
        },
        {
          id: 'servicesTable-openLogsInDiscover',
          name: i18n.translate('xpack.apm.servicesTable.actions.openLogsInDiscover', {
            defaultMessage: 'Open logs in Discover',
          }),
          href: (item) => getDiscoverHref(item, 'error'),
        },
      ],
    });

    const alertGroup = getAlertActionGroup<ServiceListItem>({
      onAlertClick: (item, ruleType) => openAlertFlyout(ruleType, item.serviceName),
    });
    if (alertGroup) {
      actionsList.push(alertGroup);
    }

    const sloGroup = getSloActionGroup<ServiceListItem>({
      onSloClick: (item, indicatorType) => openSloFlyout(indicatorType, item.serviceName),
      getManageSlosHref: sloListLocator
        ? (item) => getManageSlosUrl(sloListLocator, { serviceName: item.serviceName })
        : undefined,
    });
    if (sloGroup) {
      actionsList.push(sloGroup);
    }

    return actionsList;
  }, [
    openAlertFlyout,
    openSloFlyout,
    getDiscoverHref,
    getAlertActionGroup,
    getSloActionGroup,
    sloListLocator,
  ]);

  return actions;
}
