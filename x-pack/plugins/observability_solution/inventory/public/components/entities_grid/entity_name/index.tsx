/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import {
  AssetDetailsLocatorParams,
  ASSET_DETAILS_LOCATOR_ID,
  ServiceOverviewParams,
} from '@kbn/observability-shared-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { EntityIcon } from '../../entity_icon';
import { ENTITY_DISPLAY_NAME, ENTITY_TYPE } from '../../../../common/es_fields/entities';
import { Entity } from '../../../../common/entities';
import { parseServiceParams } from '../../../utils/parse_service_params';

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

    // Any unrecognised types will always return undefined
    switch (type) {
      case 'host':
      case 'container':
        return assetDetailsLocator?.getRedirectUrl({
          assetId: entity[ENTITY_DISPLAY_NAME],
          assetType: type,
        });

      case 'service':
        // For services, the format of the display name is `service.name:service.environment`.
        // We just want the first part of the name for the locator.
        // TODO: Replace this with a better approach for handling service names. See https://github.com/elastic/kibana/issues/194131
        return serviceOverviewLocator?.getRedirectUrl(
          parseServiceParams(entity[ENTITY_DISPLAY_NAME])
        );
    }
  }, [entity, assetDetailsLocator, serviceOverviewLocator]);

  return (
    <EuiLink data-test-subj="inventoryCellValueLink" href={getEntityRedirectUrl()}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={0}>
          <EntityIcon entity={entity} />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate">
          <span className="eui-textTruncate">{entity[ENTITY_DISPLAY_NAME]}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
}
