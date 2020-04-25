/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsBulkCreateObject } from 'src/core/server';
import { AssetType } from '../../../types';
import * as Registry from '../registry';

type ArchiveAsset = Pick<SavedObject, 'attributes' | 'migrationVersion' | 'references'>;
type SavedObjectToBe = Required<
  Pick<SavedObjectsBulkCreateObject, 'type' | 'id' | keyof ArchiveAsset>
> & {
  type: AssetType;
};

export async function getObject(key: string) {
  const buffer = Registry.getAsset(key);

  // cache values are buffers. convert to string / JSON
  const json = buffer.toString('utf8');
  // convert that to an object
  const asset: ArchiveAsset = JSON.parse(json);

  const { type, file } = Registry.pathParts(key);
  const savedObject: SavedObjectToBe = {
    type,
    id: file.replace('.json', ''),
    attributes: asset.attributes,
    references: asset.references || [],
    migrationVersion: asset.migrationVersion || {},
  };

  return savedObject;
}
