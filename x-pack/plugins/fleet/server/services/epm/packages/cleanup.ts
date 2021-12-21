/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'src/core/server';

import { removeArchiveEntries } from '../archive/storage';

import { ASSETS_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';
import type { PackageAssetReference } from '../../../../common';
import { packagePolicyService } from '../../package_policy';
import { appContextService } from '../..';

export async function removeOldAssets(options: {
  soClient: SavedObjectsClientContract;
  pkgName: string;
  currentVersion: string;
}) {
  const { soClient, pkgName, currentVersion } = options;

  // find all assets of older versions
  const aggs = {
    versions: { terms: { field: `${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_version` } },
  };
  const oldVersionsAgg = await soClient.find<any, any>({
    type: ASSETS_SAVED_OBJECT_TYPE,
    filter: `${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_name:${pkgName} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_version<${currentVersion}`,
    aggs,
    page: 0,
    perPage: 0,
  });

  const oldVersions = oldVersionsAgg.aggregations.versions.buckets.map(
    (obj: { key: string }) => obj.key
  );

  for (const oldVersion of oldVersions) {
    await removeAssetsFromVersion(soClient, pkgName, oldVersion);
  }
}

async function removeAssetsFromVersion(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  oldVersion: string
) {
  // check if any policies are using this package version
  const { total } = await packagePolicyService.list(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.version:${oldVersion}`,
    page: 0,
    perPage: 0,
  });
  // don't delete if still being used
  if (total > 0) {
    appContextService
      .getLogger()
      .debug(`Package "${pkgName}-${oldVersion}" still being used by policies`);
    return;
  }

  // check if old version has assets
  const finder = await soClient.createPointInTimeFinder({
    type: ASSETS_SAVED_OBJECT_TYPE,
    filter: `${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_name:${pkgName} AND ${ASSETS_SAVED_OBJECT_TYPE}.attributes.package_version:${oldVersion}`,
    perPage: 1000,
    fields: ['id'],
  });

  for await (const assets of finder.find()) {
    const refs = assets.saved_objects.map(
      (obj) => ({ id: obj.id, type: ASSETS_SAVED_OBJECT_TYPE } as PackageAssetReference)
    );

    await removeArchiveEntries({ savedObjectsClient: soClient, refs });
  }
  await finder.close();
}
