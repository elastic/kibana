/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestEntry } from './manifest_entry';
import {
  InternalArtifactSchema,
  InternalManifestSchema,
  ManifestSchema,
  ManifestSchemaVersion,
} from '../../schemas/artifacts';

export class Manifest {
  private entries: ManifestEntry[];
  private schemaVersion: string;

  // For concurrency control
  private version: string | undefined;

  constructor(schemaVersion: string) {
    this.entries = [];
    this.schemaVersion = schemaVersion;
  }

  public static fromArtifacts(
    artifacts: InternalArtifactSchema[],
    schemaVersion: string
  ): Manifest {
    const manifest = new Manifest(schemaVersion);
    artifacts.forEach((artifact) => {
      manifest.addEntry(artifact);
    });
    return manifest;
  }

  public getSchemaVersion(): string {
    return this.schemaVersion;
  }

  public getVersion(): string | undefined {
    return this.version;
  }

  public setVersion(version: string | undefined) {
    this.version = version;
  }

  public addEntry(artifact: InternalArtifactSchema) {
    this.entries.push(new ManifestEntry(artifact));
  }

  public contains(artifact: InternalArtifactSchema): boolean {
    for (const entry of this.entries) {
      if (artifact.identifier === entry.getIdentifier() && artifact.sha256 === entry.getSha256()) {
        return true;
      }
    }
    return false;
  }

  // Returns true if same
  public equals(manifest: Manifest): boolean {
    if (manifest.entries.length !== this.entries.length) {
      return false;
    }

    for (const entry of this.entries) {
      if (!manifest.contains(entry.getArtifact())) {
        return false;
      }
    }

    return true;
  }

  public toEndpointFormat(): ManifestSchema {
    const manifestObj: object = {
      manifestVersion: 'todo',
      schemaVersion: 'todo',
      artifacts: {},
    };
    this.entries.forEach((entry) => {
      manifestObj.artifacts[entry.getIdentifier()] = entry.getRecord();
    });
    return manifestObj as ManifestSchema;
  }

  public toSavedObject(): InternalManifestSchema {
    return {
      schemaVersion: this.schemaVersion as ManifestSchemaVersion,
      ids: this.entries.map((entry) => entry.getDocId()),
    };
  }
}
