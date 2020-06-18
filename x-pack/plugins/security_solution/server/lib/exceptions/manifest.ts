/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import { SavedObjectsClient, SavedObjectsPluginStart } from '../../../../../../src/core/server';

import { ListPluginSetup } from '../../../../lists/server';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExceptionListClient } from '../../../../lists/server/services/exception_lists/exception_list_client';

import { GetFullEndpointExceptionList, CompressExceptionList } from './lists';

import { ManifestEntry } from './manifest_entry';

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-allowlist',
  SAVED_OBJECT_TYPE: 'securitySolution-exceptions-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['linux', 'windows'],
  SUPPORTED_SCHEMA_VERSIONS: ['1.0.0'],
};

export interface ManifestOptions {
  lists: ListPluginSetup;
  savedObjects: SavedObjectsPluginStart;
}

export class ManifestService {
  private static instance: ManifestService;

  private entries: ManifestEntry[];
  private soClient: SavedObjectsClient;
  private exceptionListClient: ExceptionListClient;

  private constructor(context: ManifestOptions) {
    const savedObjectsRepository = context.savedObjects.createInternalRepository();
    this.soClient = new SavedObjectsClient(savedObjectsRepository);
    this.exceptionListClient = context.lists.getExceptionListClient(this.soClient, 'kibana');
    this.entries = [];
  }

  public static getInstance(context: ManifestOptions) {
    // TODO: lock?
    if (!ManifestService.instance) {
      ManifestService.instance = new ManifestService(context);
    }

    return ManifestService.instance;
  }

  public static getArtifactName(os: string, schemaVersion: string) {
    return `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`;
  }

  public getState(): object {
    // TODO: type
    // console.log(this.sha256);
    return this.entries
      .map((entry) => {
        // console.log(this.sha256);
        return entry.getState();
      })
      .reduce((map, state) => {
        // console.log(state.sha256);
        // console.log(state.size);
        map[state.identifier] = {
          url: state.url,
          sha256: state.sha256,
          size: state.size,
        };
        return map;
      });
  }

  public async refresh() {
    this.entries = [];
    const entries: ManifestEntry = [];

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      for (const schemaVersion of ArtifactConstants.SUPPORTED_SCHEMA_VERSIONS) {
        entries.push(new ManifestEntry(this.exceptionListClient, os, schemaVersion));
      }
    }

    entries.map(async (entry) => {
      await entry.refresh();
    });

    this.entries = entries;
  }
}
