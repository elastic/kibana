/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import {
  ASSET_DETAILS_LOCATOR_ID,
  AssetDetailsLocatorParams,
  ENTITY_DISPLAY_NAME,
  ENTITY_IDENTITY_FIELDS,
  ENTITY_TYPE,
  SERVICE_ENVIRONMENT,
  ServiceOverviewParams,
} from '@kbn/observability-shared-plugin/common';
import React, { useCallback } from 'react';
import { Entity } from '../../../../common/entities';
import { useKibana } from '../../../hooks/use_kibana';
import { EntityIcon } from '../../entity_icon';

interface EntityNameProps {
  entity: Entity;
}

export function EntityName({ entity }: EntityNameProps) {
  const { services } = useKibana();

  const assetDetailsLocator =
    services.share?.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const serviceOverviewLocator =
    services.share?.url.locators.get<ServiceOverviewParams>('serviceOverviewLocator');

  const getEntityRedirectUrl = useCallback(() => {
    const type = entity[ENTITY_TYPE];
    // For service, host and container type there is only one identity field
    const identityField = Array.isArray(entity[ENTITY_IDENTITY_FIELDS])
      ? entity[ENTITY_IDENTITY_FIELDS][0]
      : entity[ENTITY_IDENTITY_FIELDS];
    const identityValue = entity[identityField];

    switch (type) {
      case 'host':
      case 'container':
        return assetDetailsLocator?.getRedirectUrl({
          assetId: identityValue,
          assetType: type,
        });

      case 'service':
        return serviceOverviewLocator?.getRedirectUrl({
          serviceName: identityValue,
          environment: [entity[SERVICE_ENVIRONMENT] || undefined].flat()[0],
        });
    }
  }, [entity, assetDetailsLocator, serviceOverviewLocator]);

  return (
    <EuiLink data-test-subj="entityNameLink" href={getEntityRedirectUrl()}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={0}>
          <EntityIcon entity={entity} />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate">
          <span className="eui-textTruncate" data-test-subj="entityNameDisplayName">
            {entity[ENTITY_DISPLAY_NAME]}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
}
