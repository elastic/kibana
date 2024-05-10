/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { OAMDefinition } from '@kbn/oam-schema';
import { SO_OAM_DEFINITION_TYPE } from '../../saved_objects';
import { OAMIdConflict } from './errors/oam_id_conflict_error';

export async function saveOAMDefinition(
  soClient: SavedObjectsClientContract,
  definition: OAMDefinition
): Promise<OAMDefinition> {
  const response = await soClient.find<OAMDefinition>({
    type: SO_OAM_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_OAM_DEFINITION_TYPE}.attributes.id:(${definition.id})`,
  });

  if (response.total === 1) {
    throw new OAMIdConflict(`OAM Defintion with [${definition.id}] already exists.`, definition);
  }

  await soClient.create<OAMDefinition>(SO_OAM_DEFINITION_TYPE, definition, {
    id: definition.id,
    overwrite: true,
  });

  return definition;
}
