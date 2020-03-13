/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import * as Registry from './epm/registry';
import { getInstallationObject, findInstalledPackageByName } from './epm/packages/get';
import { Installation } from '../types';

export class IndexPatternService {
  public async get(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string,
    version?: string
  ): Promise<string | undefined> {
    let installation: Installation | undefined;
    if (version) {
      const pkgkey = Registry.pkgToPkgKey({
        name: pkgName,
        version,
      });
      installation = (await getInstallationObject({ savedObjectsClient, pkgkey }))?.attributes;
    } else {
      installation = await findInstalledPackageByName({ savedObjectsClient, pkgName });
    }
    return installation?.installed.patterns[datasetPath];
  }
}
