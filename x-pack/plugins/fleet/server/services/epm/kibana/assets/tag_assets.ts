/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taggableTypes } from '@kbn/saved-objects-tagging-plugin/common/constants';
import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import type { KibanaAssetType } from '../../../../../common';

import type { ArchiveAsset } from './install';
import { KibanaSavedObjectTypeMapping } from './install';

const TAG_COLOR = '#FFFFFF';
const MANAGED_TAG_NAME = 'Managed';
const MANAGED_TAG_ID = 'managed';

export async function tagKibanaAssets({
  savedObjectTagAssignmentService,
  savedObjectTagClient,
  kibanaAssets,
  pkgTitle,
  pkgName,
}: {
  savedObjectTagAssignmentService: IAssignmentService;
  savedObjectTagClient: ITagsClient;
  kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>;
  pkgTitle: string;
  pkgName: string;
}) {
  const taggableAssets = Object.entries(kibanaAssets).flatMap(([assetType, assets]) => {
    if (!taggableTypes.includes(KibanaSavedObjectTypeMapping[assetType as KibanaAssetType])) {
      return [];
    }

    if (!assets.length) {
      return [];
    }

    return assets;
  });

  // no assets to tag
  if (taggableAssets.length === 0) {
    return;
  }

  const allTags = await savedObjectTagClient.getAll();
  let managedTag = allTags.find((tag) => tag.name === MANAGED_TAG_NAME);
  if (!managedTag) {
    managedTag = await savedObjectTagClient.create(
      {
        name: MANAGED_TAG_NAME,
        description: '',
        color: TAG_COLOR,
      },
      { id: MANAGED_TAG_ID, overwrite: true, refresh: false }
    );
  }

  let packageTag = allTags.find((tag) => tag.name === pkgTitle);
  if (!packageTag) {
    packageTag = await savedObjectTagClient.create(
      {
        name: pkgTitle,
        description: '',
        color: TAG_COLOR,
      },
      { id: pkgName, overwrite: true, refresh: false }
    );
  }

  await savedObjectTagAssignmentService.updateTagAssignments({
    tags: [managedTag.id, packageTag.id],
    assign: taggableAssets,
    unassign: [],
    refresh: false,
  });
}
