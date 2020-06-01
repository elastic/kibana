/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { getInstallation } from './epm/packages';
import { ESIndexPatternService } from '../../server';

export class ESIndexPatternSavedObjectService implements ESIndexPatternService {
  public async getESIndexPattern(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string
  ): Promise<string | undefined> {
    const installation = await getInstallation({ savedObjectsClient, pkgName });
    return installation?.es_index_patterns[datasetPath];
  }
}
