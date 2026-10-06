/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ASSET_DETAILS_LOCATOR_ID,
  type AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import type { ProfilingLocators } from '@kbn/observability-shared-plugin/public';
import { getLogsLocatorFromUrlService } from '@kbn/logs-shared-plugin/common';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { useLocation } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { ApmFeatureFlagName } from '../../../../common/apm_feature_flags';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmFeatureFlag } from '../../../hooks/use_apm_feature_flag';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { getSections } from './sections';

/** Resolves the built-in "Investigate" menu sections shared by the action popover and the transaction flyout footer. */
export function useTransactionActionMenuSections(
  transaction: Transaction | undefined,
  profilingLocators: ProfilingLocators | undefined
) {
  const { core, share, metricsDataAccess } = useApmPluginContext();
  const location = useLocation();
  const apmRouter = useApmRouter();
  const { dataView } = useAdHocApmDataView();

  const metricsIndicesAsync = useAsync(() => {
    return metricsDataAccess?.metricsClient.metricsIndices() ?? Promise.resolve(undefined);
  }, [metricsDataAccess]);

  const metricsIndices = metricsIndicesAsync.value?.metricIndices;

  const logsLocator = getLogsLocatorFromUrlService(share?.url)!;

  const uptimeLocator = share?.url?.locators?.get(uptimeOverviewLocatorID);

  const infraLinksAvailable = useApmFeatureFlag(ApmFeatureFlagName.InfraUiAvailable);

  const assetDetailsLocator =
    share?.url?.locators?.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const discoverLocator = share?.url?.locators?.get(DISCOVER_APP_LOCATOR);

  const {
    query: { rangeFrom, rangeTo, environment },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );

  return getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    apmRouter,
    infraLinksAvailable,
    uptimeLocator,
    profilingLocators,
    rangeFrom,
    rangeTo,
    environment,
    logsLocator,
    dataViewId: dataView?.id,
    assetDetailsLocator,
    discoverLocator,
    metricsIndices,
  });
}

export interface ExternalTransactionAction {
  id: string;
  name: string;
  href?: string;
  onClick: () => void;
}

/**
 * Resolves the actions other plugins register on `O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER` with
 * string names, which flyout footer menu items require. The action popover renders the same actions
 * through `getContextMenuItemsFromActions`, whose labels are elements.
 */
export function useExternalTransactionActions(
  transaction: Transaction | undefined
): ExternalTransactionAction[] {
  const { uiActions } = useApmPluginContext();

  const { value = [] } = useAsync(async () => {
    if (!transaction) {
      return [];
    }

    const trigger = { id: O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER };
    const actions = await uiActions.getTriggerCompatibleActions(trigger.id, transaction);
    // The ECS `event` field collides with the action context's `event` (a mouse event), so the
    // document is passed untyped, as `getContextMenuItemsFromActions` does.
    const documentContext: Record<string, any> = transaction;
    const context = { ...documentContext, trigger };

    return Promise.all(
      actions.map(async (action) => ({
        id: action.id,
        name: action.getDisplayName(context),
        href: action.getHref ? await action.getHref(context) : undefined,
        onClick: () => action.execute(context),
      }))
    );
  }, [transaction, uiActions]);

  return value;
}
