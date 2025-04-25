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
import type { IAssignmentService } from '@kbn/saved-objects-tagging-plugin/server';
import type { ITagsClient } from '@kbn/saved-objects-tagging-plugin/common/types';

import type { KibanaAssetType } from '../../../../../common';
import type { PackageSpecTags } from '../../../../types';

import { appContextService } from '../../../app_context';

import type { ArchiveAsset } from './install';
import { KibanaSavedObjectTypeMapping } from './install';

interface ObjectReference {
  type: string;
  id: string;
}
interface PackageSpecTagsAssets {
  tagId: string;
  assets: ObjectReference[];
}

interface GroupedAssets {
  [assetId: string]: { type: string; tags: string[] };
}

const MANAGED_TAG_COLOR = '#0077CC';
const PACKAGE_TAG_COLOR = '#4DD2CA';
const MANAGED_TAG_NAME = 'Managed';
const LEGACY_MANAGED_TAG_ID = 'managed';
const SECURITY_SOLUTION_TAG_NAME = 'Security Solution';
const SECURITY_SOLUTION_TAG_ID_BASE = 'security-solution';

// the tag service only accepts 6-digits hex colors
const TAG_COLORS = [
  '#FEC514',
  '#F583B7',
  '#F04E98',
  '#00BFB3',
  '#FEC514',
  '#BADA55',
  '#FFA500',
  '#9696F1',
  '#D36086',
  '#54B399',
  '#AAA8A5',
  '#A0A0A0',
];

const getManagedTagId = (spaceId: string) => `fleet-managed-${spaceId}`;
const getPackageTagId = (spaceId: string, pkgName: string) => `fleet-pkg-${pkgName}-${spaceId}`;
const getLegacyPackageTagId = (pkgName: string) => pkgName;

/*
  This function is exported via fleet/plugin.ts to make it available to other plugins
  The `SecuritySolution` tag is a special case that needs to be handled separately
  In that case return id `security-solution-default`
*/
export const getPackageSpecTagId = (spaceId: string, pkgName: string, tagName: string) => {
  if (tagName.toLowerCase() === SECURITY_SOLUTION_TAG_NAME.toLowerCase()) {
    return `${SECURITY_SOLUTION_TAG_ID_BASE}-${spaceId}`;
  }

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

    const packageSpecAssets = await getPackageSpecTags(taggableAssets, opts);
    const groupedAssets = groupByAssetId(packageSpecAssets);

    if (Object.entries(groupedAssets).length > 0) {
      await Promise.all(
        Object.entries(groupedAssets).map(async ([assetId, asset]) => {
          try {
            await savedObjectTagAssignmentService.updateTagAssignments({
              tags: asset.tags,
              assign: [{ id: assetId, type: asset.type }],
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
      color: MANAGED_TAG_COLOR,
    },
    { id: managedTagId, overwrite: true, refresh: false, managed: true }
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
    { id: packageTagId, overwrite: true, refresh: false, managed: true }
  );

  return packageTagId;
}

// Ensure that asset tags coming from the kibana/tags.yml file are correctly parsed and created
async function getPackageSpecTags(
  taggableAssets: ArchiveAsset[],
  opts: Pick<TagAssetsParams, 'spaceId' | 'savedObjectTagClient' | 'pkgName' | 'assetTags'>
): Promise<PackageSpecTagsAssets[]> {
  const { spaceId, savedObjectTagClient, pkgName, assetTags } = opts;
  if (!assetTags || assetTags?.length === 0) return [];

  const assetsWithTags = await Promise.all(
    assetTags.map(async (tag) => {
      const uniqueTagId = getPackageSpecTagId(spaceId, pkgName, tag.text);
      const existingPackageSpecTag = await savedObjectTagClient.get(uniqueTagId).catch(() => {});

      if (!existingPackageSpecTag) {
        await savedObjectTagClient.create(
          {
            name: tag.text,
            description: 'Tag defined in package-spec',
            color: getRandomColor(),
          },
          { id: uniqueTagId, overwrite: true, refresh: false, managed: true }
        );
      }
      const assetTypes = getAssetTypesObjectReferences(tag?.asset_types, taggableAssets);
      const assetIds = getAssetIdsObjectReferences(tag?.asset_ids, taggableAssets);
      const totAssetsToAssign = assetTypes.concat(assetIds);
      const assetsToAssign = totAssetsToAssign.length > 0 ? uniqBy(totAssetsToAssign, 'id') : [];

      return { tagId: uniqueTagId, assets: assetsToAssign };
    })
  );
  return assetsWithTags;
}

// Get all the assets of types defined in tag.asset_types from taggable kibanaAssets
const getAssetTypesObjectReferences = (
  assetTypes: string[] | undefined,
  taggableAssets: ArchiveAsset[]
): ObjectReference[] => {
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
): ObjectReference[] => {
  if (!assetIds || assetIds.length === 0) return [];

  return taggableAssets
    .filter((taggable) => assetIds.includes(taggable.id))
    .map((assetType) => {
      return { type: assetType.type, id: assetType.id };
    });
};

// Utility function that groups the assets by asset id
// It makes easier to update the tags in batches
const groupByAssetId = (packageSpecsAssets: PackageSpecTagsAssets[]): GroupedAssets => {
  if (packageSpecsAssets.length === 0) return {};

  const groupedAssets: GroupedAssets = {};

  packageSpecsAssets.forEach(({ tagId, assets }) => {
    assets.forEach((asset) => {
      const { id } = asset;

      if (!groupedAssets[id]) {
        groupedAssets[id] = { type: asset.type, tags: [] };
      }
      groupedAssets[id].tags.push(tagId);
    });
  });
  return groupedAssets;
};
