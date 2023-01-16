/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsImportSuccess } from '@kbn/core-saved-objects-common';
import { taggableTypes } from '@kbn/saved-objects-tagging-plugin/common/constants';
import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import type { KibanaAssetType } from '../../../../../common';
import { appContextService } from '../../../app_context';

import type { ArchiveAsset } from './install';
import { KibanaSavedObjectTypeMapping } from './install';

const TAG_COLOR = '#FFFFFF';
const MANAGED_TAG_NAME = 'Managed';
const LEGACY_MANAGED_TAG_ID = 'managed';

const getManagedTagId = (spaceId: string) => `fleet-managed-${spaceId}`;
const getPackageTagId = (spaceId: string, pkgName: string) => `fleet-pkg-${pkgName}-${spaceId}`;
const getLegacyPackageTagId = (pkgName: string) => pkgName;

interface TagAssetsParams {
  savedObjectTagAssignmentService: IAssignmentService;
  savedObjectTagClient: ITagsClient;
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>;
  pkgTitle: string;
  pkgName: string;
  spaceId: string;
  importedAssets: SavedObjectsImportSuccess[];
}

export async function tagKibanaAssets(opts: TagAssetsParams) {
  const { savedObjectTagAssignmentService, kibanaAssets, importedAssets } = opts;
  const getNewId = (assetId: string) =>
    importedAssets.find((imported) => imported.id === assetId)?.destinationId ?? assetId;
  const taggableAssets = getTaggableAssets(kibanaAssets).map((asset) => ({
    ...asset,
    id: getNewId(asset.id),
  }));

  // no assets to tag
  if (taggableAssets.length === 0) {
    return;
  }

  const [managedTagId, packageTagId] = await Promise.all([
    ensureManagedTag(opts),
    ensurePackageTag(opts),
  ]);

  try {
    await savedObjectTagAssignmentService.updateTagAssignments({
      tags: [managedTagId, packageTagId],
      assign: taggableAssets,
      unassign: [],
      refresh: false,
    });
  } catch (error) {
    if (error.status === 404) {
      appContextService.getLogger().warn(error.message);
      return;
    }
    throw error;
  }
}

function getTaggableAssets(kibanaAssets: TagAssetsParams['kibanaAssets']) {
  return Object.entries(kibanaAssets).flatMap(([assetType, assets]) => {
    if (!taggableTypes.includes(KibanaSavedObjectTypeMapping[assetType as KibanaAssetType])) {
      return [];
    }

    if (!assets.length) {
      return [];
    }

    return assets;
  });
}

async function ensureManagedTag(
  opts: Pick<TagAssetsParams, 'spaceId' | 'savedObjectTagClient'>
): Promise<string> {
  const { spaceId, savedObjectTagClient } = opts;

  const managedTagId = getManagedTagId(spaceId);
  const managedTag = await savedObjectTagClient.get(managedTagId).catch(() => {});

  if (managedTag) return managedTagId;

  const legacyManagedTag = await savedObjectTagClient.get(LEGACY_MANAGED_TAG_ID).catch(() => {});

  if (legacyManagedTag) return LEGACY_MANAGED_TAG_ID;

  await savedObjectTagClient.create(
    {
      name: MANAGED_TAG_NAME,
      description: '',
      color: TAG_COLOR,
    },
    { id: managedTagId, overwrite: true, refresh: false }
  );

  return managedTagId;
}

async function ensurePackageTag(
  opts: Pick<TagAssetsParams, 'spaceId' | 'savedObjectTagClient' | 'pkgName' | 'pkgTitle'>
): Promise<string> {
  const { spaceId, savedObjectTagClient, pkgName, pkgTitle } = opts;

  const packageTagId = getPackageTagId(spaceId, pkgName);
  const packageTag = await savedObjectTagClient.get(packageTagId).catch(() => {});

  if (packageTag) return packageTagId;

  const legacyPackageTagId = getLegacyPackageTagId(pkgName);
  const legacyPackageTag = await savedObjectTagClient.get(legacyPackageTagId).catch(() => {});

  if (legacyPackageTag) return legacyPackageTagId;

  await savedObjectTagClient.create(
    {
      name: pkgTitle,
      description: '',
      color: TAG_COLOR,
    },
    { id: packageTagId, overwrite: true, refresh: false }
  );

  return packageTagId;
}
