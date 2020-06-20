/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import { SavedObjectsClient, SavedObjectsPluginStart } from '../../../../../../src/core/server';

import { ListPluginSetup } from '../../../../lists/server';

import { ExceptionListClient } from '../../../../lists/server';

import { GetFullEndpointExceptionList, CompressExceptionList } from './lists';

import { ManifestEntry } from './manifest_entry';

import { ArtifactConstants } from './common';

export class Manifest {
  private entries: ManifestEntry[];

  constructor(context: ManifestOptions) {
    this.entries = [];
  }

  public getState(): object {
    // TODO: type
    return this.entries
      .map((entry) => {
        return entry.getState();
      })
      .reduce((map, state) => {
        map[state.identifier] = {
          url: state.url,
          sha256: state.sha256,
          size: state.size,
        };
        return map;
      });
  }

  public contains(artifact: InternalArtifactSchema): boolean {
    // TODO
    // calculate id (identifier + sha256)
    // look up id
    // return if found
  }
}
