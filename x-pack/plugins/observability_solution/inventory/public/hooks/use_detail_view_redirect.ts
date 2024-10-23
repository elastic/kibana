/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ASSET_DETAILS_LOCATOR_ID,
  AssetDetailsLocatorParams,
  CONTAINER_ID,
  ENTITY_TYPE,
  HOST_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SERVICE_OVERVIEW_LOCATOR_ID,
  ServiceOverviewParams,
} from '@kbn/observability-shared-plugin/common';
import { useCallback } from 'react';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { Entity } from '../../common/entities';
import { unflattenEntity } from '../../common/utils/unflatten_entity';
import { useKibana } from './use_kibana';

const KUBERNETES_DASHBOARDS_IDS: Record<string, string> = {
  kubernetes_cluster_ecs: 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
  kubernetes_cron_job_ecs: 'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
  kubernetes_daemon_set_ecs: 'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
  kubernetes_deployment_ecs: 'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
  kubernetes_job_ecs: 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
  kubernetes_node_ecs: 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
  kubernetes_pod_ecs: 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
  kubernetes_stateful_set_ecs: 'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
};

export const useDetailViewRedirect = () => {
  const {
    services: { share, entityManager },
  } = useKibana();

  const locators = share.url.locators;
  const assetDetailsLocator = locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);
  const dashboardLocator = locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const serviceOverviewLocator = locators.get<ServiceOverviewParams>(SERVICE_OVERVIEW_LOCATOR_ID);

  const getIdentityValue = useCallback(
    (entity: Entity) => entityManager.entityClient.getIdentityFieldsValue(unflattenEntity(entity)),
    [entityManager.entityClient]
  );

  const getDetailViewRedirectUrl = useCallback(
    (entity: Entity) => {
      const type = entity[ENTITY_TYPE];
      const identityValue = getIdentityValue(entity);

      switch (type) {
        case 'host':
          return assetDetailsLocator?.getRedirectUrl({
            assetId: identityValue[HOST_NAME],
            assetType: type,
          });
        case 'container':
          return assetDetailsLocator?.getRedirectUrl({
            assetId: identityValue[CONTAINER_ID],
            assetType: type,
          });
        case 'service':
          return serviceOverviewLocator?.getRedirectUrl({
            serviceName: identityValue[SERVICE_NAME],
            environment: identityValue[SERVICE_ENVIRONMENT],
          });

        default:
          return undefined;
      }
    },
    [assetDetailsLocator, getIdentityValue, serviceOverviewLocator]
  );

  const getDashboardRedirectUrl = useCallback(
    (entity: Entity) => {
      const type = entity[ENTITY_TYPE];
      const dashboardId = KUBERNETES_DASHBOARDS_IDS[type];

      return dashboardId
        ? dashboardLocator?.getRedirectUrl({
            dashboardId,
            query: {
              language: 'kuery',
              query: entityManager.entityClient.asKqlFilter(unflattenEntity(entity)),
            },
          })
        : undefined;
    },
    [dashboardLocator, entityManager.entityClient]
  );

  const getEntityRedirectUrl = useCallback(
    (entity: Entity) => getDetailViewRedirectUrl(entity) ?? getDashboardRedirectUrl(entity),
    [getDashboardRedirectUrl, getDetailViewRedirectUrl]
  );

  return { getEntityRedirectUrl };
};
