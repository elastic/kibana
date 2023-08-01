/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { uniqBy } from 'lodash';
import type { SavedObjectsImportSuccess } from '@kbn/core-saved-objects-common';
import { taggableTypes } from '@kbn/saved-objects-tagging-plugin/common/constants';
import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import type { KibanaAssetType } from '../../../../../common';
import type { PackageSpecTags } from '../../../../types';

import { appContextService } from '../../../app_context';

import type { ArchiveAsset } from './install';
import { KibanaSavedObjectTypeMapping } from './install';

const MANAGED_TAG_COLOR = '#0077cc';
const PACKAGE_TAG_COLOR = '#4dd2ca';
const MANAGED_TAG_NAME = 'Managed';
const LEGACY_MANAGED_TAG_ID = 'managed';
const TAG_COLORS = [
  '#fec514',
  '#f583b7',
  '#07C',
  '#F04E98',
  '#00BFB3',
  '#FEC514',
  '#BD271E',
  '#BADA55',
  '#FFA500',
  '#FCF7BC',
  '#0000FF',
  '#AAA',
  '#333',
  '#DDD',
];

const getManagedTagId = (spaceId: string) => `fleet-managed-${spaceId}`;
const getPackageTagId = (spaceId: string, pkgName: string) => `fleet-pkg-${pkgName}-${spaceId}`;
const getLegacyPackageTagId = (pkgName: string) => pkgName;

// TODO: this function must be exported to be used by other plugins
export const getPackageSpecTagId = (spaceId: string, pkgName: string, tagName: string) => {
  // UUID v5 needs a namespace (uuid.DNS) to generate a predictable uuid
  const uniqueId = uuidv5(`${tagName.toLowerCase()}`, uuidv5.DNS);
  return `fleet-shared-tag-${pkgName}-${uniqueId}-${spaceId}`;
};

const getRandomColor = () => {
  const randomizedIndex = Math.floor(Math.random() * TAG_COLORS.length);
  return TAG_COLORS[randomizedIndex];
};

interface TagAssetsParams {
  savedObjectTagAssignmentService: IAssignmentService;
  savedObjectTagClient: ITagsClient;
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>;
  pkgTitle: string;
  pkgName: string;
  spaceId: string;
  importedAssets: SavedObjectsImportSuccess[];
  assetTags?: PackageSpecTags[];
}

export async function tagKibanaAssets(opts: TagAssetsParams) {
  const { savedObjectTagAssignmentService, kibanaAssets, importedAssets } = opts;

  const getNewId = (assetId: string) =>
    importedAssets.find((imported) => imported.id === assetId)?.destinationId ?? assetId;
  const taggableAssets = getTaggableAssets(kibanaAssets).map((asset) => ({
    ...asset,
    id: getNewId(asset.id),
  }));

  if (taggableAssets.length > 0) {
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

  createPackageSpecTags(savedObjectTagAssignmentService, taggableAssets, opts);
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
      color: MANAGED_TAG_COLOR,
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
      color: PACKAGE_TAG_COLOR,
    },
    { id: packageTagId, overwrite: true, refresh: false }
  );

  return packageTagId;
}

// Ensure that asset tags coming from the kibana/tags.yml file are correctly parsed
// Then create the corresponding object tags and assign them to the taggable requested assets
export async function createPackageSpecTags(
  savedObjectTagAssignmentService: IAssignmentService,
  taggableAssets: ArchiveAsset[],
  opts: Pick<TagAssetsParams, 'spaceId' | 'savedObjectTagClient' | 'pkgName' | 'assetTags'>
) {
  const { spaceId, savedObjectTagClient, pkgName, assetTags } = opts;
  if (!assetTags || assetTags?.length === 0) return;

  await Promise.all(
    assetTags.map(async (tag) => {
      const uniqueTagId = getPackageSpecTagId(spaceId, pkgName, tag.text);
      const existingPackageSpecTag = await savedObjectTagClient.get(uniqueTagId).catch(() => {});

      if (!existingPackageSpecTag) {
        savedObjectTagClient.create(
          {
            name: tag.text,
            description: 'Tag defined in package-spec',
            color: getRandomColor(),
          },
          { id: uniqueTagId, overwrite: true, refresh: false }
        );
      }

      const assetTypes = getAssetTypesObjectReferences(tag?.asset_types, taggableAssets);
      const assetIds = getAssetIdsObjectReferences(tag?.asset_ids, taggableAssets);
      const totAssetsToAssign = assetTypes.concat(assetIds);
      const assetsToAssign = totAssetsToAssign.length > 0 ? uniqBy(totAssetsToAssign, 'id') : [];

      if (!assetsToAssign?.length) return;

      try {
        await savedObjectTagAssignmentService.updateTagAssignments({
          tags: [uniqueTagId],
          assign: assetsToAssign,
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
    })
  );
}

// Get all the assets of types defined in tag.asset_types from taggable kibanaAssets
const getAssetTypesObjectReferences = (
  assetTypes: string[] | undefined,
  taggableAssets: ArchiveAsset[]
) => {
  if (!assetTypes || assetTypes.length === 0) return [];

  return taggableAssets
    .filter((taggable) => assetTypes.includes(taggable.type))
    .map((assetType) => {
      return { type: assetType.type, id: assetType.id };
    });
};

// Get the references to ids defined in tag.asset_ids from taggable kibanaAssets
const getAssetIdsObjectReferences = (
  assetIds: string[] | undefined,
  taggableAssets: ArchiveAsset[]
) => {
  if (!assetIds || assetIds.length === 0) return [];

  return taggableAssets
    .filter((taggable) => assetIds.includes(taggable.id))
    .map((assetType) => {
      return { type: assetType.type, id: assetType.id };
    });
};
