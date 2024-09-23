/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinition } from '@kbn/entities-schema';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import type { PackageInstallContext } from '../../../../../../common/types';
import { getAssetFromAssetsMap, getPathParts } from '../../../archive';

export async function stepInstallEntityDefinitions(context: InstallContext) {
  const { packageInstallContext, entityClient } = context;

  await withPackageSpan('Install Entity definitions', async () => {
    const assets = await getEntityDefinitionAssets(packageInstallContext);

    await Promise.all(
      assets.map(async (asset) => {
        return entityClient?.createEntityDefinition({
          definition: asset.definition,
        });
      })
    );
  });
}

export async function cleanUpEntityDefinitionsStep(context: InstallContext) {
  const { packageInstallContext } = context;
  const { packageInfo } = packageInstallContext;
}

interface EntityDefinitionArchive {
  definition: EntityDefinition;
}

export function getEntityDefinitionAssets(
  packageInstallContext: PackageInstallContext
): EntityDefinitionArchive[] {
  const isEntityDefinition = (path: string) => {
    const parts = getPathParts(path);

    return parts.service === 'kibana' && parts.type === 'entity_definition';
  };

  const definitions = packageInstallContext.paths.filter(isEntityDefinition).map((path: string) => {
    const buffer = getAssetFromAssetsMap(packageInstallContext.assetsMap, path);
    const asset = JSON.parse(buffer.toString('utf8'));
    return asset;
  });

  return definitions;
}
