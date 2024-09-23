/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinition } from '@kbn/entities-schema';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import type { Installation, PackageInstallContext } from '../../../../../../common/types';
import { getAssetFromAssetsMap, getPathParts } from '../../../archive';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common';

export async function stepInstallEntityDefinitions(context: InstallContext) {
  const { packageInstallContext, entityClient, savedObjectsClient } = context;
  const { packageInfo } = packageInstallContext;

  return await withPackageSpan('Install Entity definitions', async () => {
    const assets = await getEntityDefinitionAssets(packageInstallContext);

    await Promise.all(
      assets.map(async (asset) => {
        return entityClient?.createEntityDefinition({
          definition: asset.definition,
        });
      })
    );

    await savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, packageInfo.name, {
      installed_entity_definitions: assets.map((asset) => asset.definition.id),
    });
  });
}

export async function cleanUpEntityDefinitionsStep(context: InstallContext) {
  const { packageInstallContext, entityClient } = context;

  await withPackageSpan('Clean up Entity definitions', async () => {
    const assets = await getEntityDefinitionAssets(packageInstallContext);

    await Promise.all(
      assets.map(async ({ definition }) => {
        const result = await entityClient?.getEntityDefinitions({ id: definition.id });
        if (result?.definitions.length) {
          return entityClient?.deleteEntityDefinition({ id: definition.id });
        }
      })
    );
  });
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
