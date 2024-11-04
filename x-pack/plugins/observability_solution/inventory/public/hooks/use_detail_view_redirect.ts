/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ASSET_DETAILS_LOCATOR_ID,
  AssetDetailsLocatorParams,
  ENTITY_IDENTITY_FIELDS,
  ENTITY_TYPE,
  ENTITY_TYPES,
  SERVICE_ENVIRONMENT,
  SERVICE_OVERVIEW_LOCATOR_ID,
  ServiceOverviewParams,
} from '@kbn/observability-shared-plugin/common';
import { useCallback } from 'react';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { castArray } from 'lodash';
import type { Entity } from '../../common/entities';
import { unflattenEntity } from '../../common/utils/unflatten_entity';
import { useKibana } from './use_kibana';

const KUBERNETES_DASHBOARDS_IDS: Record<string, string> = {
  [ENTITY_TYPES.KUBERNETES.CLUSTER.ecs]: 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
  [ENTITY_TYPES.KUBERNETES.CLUSTER.semconv]: 'kubernetes_otel-cluster-overview',
  [ENTITY_TYPES.KUBERNETES.CRONJOB.ecs]: 'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
  [ENTITY_TYPES.KUBERNETES.DAEMONSET.ecs]: 'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
  [ENTITY_TYPES.KUBERNETES.DEPLOYMENT.ecs]: 'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
  [ENTITY_TYPES.KUBERNETES.JOB.ecs]: 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
  [ENTITY_TYPES.KUBERNETES.NODE.ecs]: 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
  [ENTITY_TYPES.KUBERNETES.POD.ecs]: 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
  [ENTITY_TYPES.KUBERNETES.STATEFULSET.ecs]: 'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
};

export const useDetailViewRedirect = () => {
  const {
    services: { share, entityManager },
  } = useKibana();

  const locators = share.url.locators;
  const assetDetailsLocator = locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);
  const dashboardLocator = locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const serviceOverviewLocator = locators.get<ServiceOverviewParams>(SERVICE_OVERVIEW_LOCATOR_ID);

  const getSingleIdentityFieldValue = useCallback(
    (entity: Entity) => {
      const identityFields = castArray(entity[ENTITY_IDENTITY_FIELDS]);
      if (identityFields.length > 1) {
        throw new Error(`Multiple identity fields are not supported for ${entity[ENTITY_TYPE]}`);
      }

      const identityField = identityFields[0];
      return entityManager.entityClient.getIdentityFieldsValue(unflattenEntity(entity))[
        identityField
      ];
    },
    [entityManager.entityClient]
  );

  const getDetailViewRedirectUrl = useCallback(
    (entity: Entity) => {
      const type = entity[ENTITY_TYPE];
      const identityValue = getSingleIdentityFieldValue(entity);

      switch (type) {
        case ENTITY_TYPES.HOST:
        case ENTITY_TYPES.CONTAINER:
          return assetDetailsLocator?.getRedirectUrl({
            assetId: identityValue,
            assetType: type,
          });

        case 'service':
          return serviceOverviewLocator?.getRedirectUrl({
            serviceName: identityValue,
            // service.environemnt is not part of entity.identityFields
            // we need to manually get its value
            environment: [entity[SERVICE_ENVIRONMENT] || undefined].flat()[0],
          });

        default:
          return undefined;
      }
    },
    [assetDetailsLocator, getSingleIdentityFieldValue, serviceOverviewLocator]
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
