/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { compositeSloSchema } from '@kbn/slo-schema';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';

import { CompositeSLO, StoredCompositeSLO } from '../../domain/models/composite_slo';
import { CompositeSLOIdConflict, CompositeSLONotFound } from '../../errors';
import { SO_COMPOSITE_SLO_TYPE } from '../../saved_objects';

export interface CompositeSLORepository {
  save(compositeSlo: CompositeSLO, options?: { throwOnConflict: boolean }): Promise<CompositeSLO>;
  deleteById(id: string): Promise<void>;
}

const SAVED_OBJECT_ATTRIBUTES_PATH = 'composite-slo.attributes';

export class KibanaSavedObjectsCompositeSLORepository implements CompositeSLORepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async save(
    compositeSlo: CompositeSLO,
    options = { throwOnConflict: false }
  ): Promise<CompositeSLO> {
    let existingSavedObjectId;
    const findResponse = await this.soClient.find<StoredCompositeSLO>({
      type: SO_COMPOSITE_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `${SAVED_OBJECT_ATTRIBUTES_PATH}.id:(${compositeSlo.id})`,
    });

    if (findResponse.total === 1) {
      if (options.throwOnConflict) {
        throw new CompositeSLOIdConflict(`Composite SLO [${compositeSlo.id}] already exists`);
      }

      existingSavedObjectId = findResponse.saved_objects[0].id;
    }

    const createResponse = await this.soClient.create<StoredCompositeSLO>(
      SO_COMPOSITE_SLO_TYPE,
      toStoredCompositeSLO(compositeSlo),
      {
        id: existingSavedObjectId,
        overwrite: true,
      }
    );

    return toCompositeSLO(createResponse.attributes);
  }

  async deleteById(id: string): Promise<void> {
    const response = await this.soClient.find<StoredCompositeSLO>({
      type: SO_COMPOSITE_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `${SAVED_OBJECT_ATTRIBUTES_PATH}.id:(${id})`,
    });

    if (response.total === 0) {
      throw new CompositeSLONotFound(`Composite SLO [${id}] not found`);
    }

    await this.soClient.delete(SO_COMPOSITE_SLO_TYPE, response.saved_objects[0].id);
  }
}

function toStoredCompositeSLO(compositeSlo: CompositeSLO): StoredCompositeSLO {
  return compositeSloSchema.encode(compositeSlo);
}

function toCompositeSLO(storedCompositeSlo: StoredCompositeSLO): CompositeSLO {
  return pipe(
    compositeSloSchema.decode(storedCompositeSlo),
    fold(() => {
      throw new Error(`Invalid stored composite SLO [${storedCompositeSlo.id}]`);
    }, t.identity)
  );
}
