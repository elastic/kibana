/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { getInstallation } from './epm/packages/get';

export interface IndexPatternService {
  get(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string
  ): Promise<string | undefined>;
}

export class IndexPatternSavedObjectService implements IndexPatternService {
  public async get(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string
  ): Promise<string | undefined> {
    const installation = await getInstallation({ savedObjectsClient, pkgName });
    return installation?.installed.patterns[datasetPath];
  }
}
