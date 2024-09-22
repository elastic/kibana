/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Asset, AssetType } from '../../../common/assets';
import type { Entity, IdentityField } from '../../../common/entities';
import { getEntitySourceKql } from '../../../common/utils/get_entity_source_kql';

export function getIconForAssetType(type: AssetType): string {
  switch (type) {
    case 'dashboard':
      return 'container';
    case 'rule':
      return 'bell';
    case 'sloDefinition':
      return 'temperature';
  }
}

export function getLabelForAssetType(type: AssetType): string {
  switch (type) {
    case 'dashboard':
      return i18n.translate('xpack.inventory.assets.typeDashboard', {
        defaultMessage: 'Dashboard',
      });
    case 'rule':
      return i18n.translate('xpack.inventory.assets.typeRule', {
        defaultMessage: 'Rule',
      });
    case 'sloDefinition':
      return i18n.translate('xpack.inventory.assets.typeSloDefinition', {
        defaultMessage: 'SLO',
      });
  }
}

export async function getHrefForAsset({
  asset,
  dashboardLocator,
  entity,
  identityFields,
  basePath,
}: {
  asset: Asset;
  dashboardLocator?: LocatorPublic<SerializableRecord>;
  entity: Entity;
  identityFields: IdentityField[];
  basePath: { prepend: (url: string) => string };
}): Promise<string> {
  switch (asset.type) {
    case 'dashboard': {
      const query = getEntitySourceKql({ entity, identityFields });
      const href = await dashboardLocator?.getRedirectUrl({
        dashboardId: asset.id,
        query: query ? { query, language: 'kuery' } : undefined,
      });
      return href ?? '';
    }
    case 'rule':
      return basePath.prepend(
        `/app/management/insightsAndAlerting/triggersActions/rule/${asset.id}`
      );
    case 'sloDefinition':
      return 'temperature';
  }
}
