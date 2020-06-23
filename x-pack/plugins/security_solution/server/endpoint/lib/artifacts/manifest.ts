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

export interface ManifestDiff {
  type: string;
  id: string;
}

export class Manifest {
  private created: Date;
  private entries: Record<string, ManifestEntry>;
  private schemaVersion: string;

  // For concurrency control
  private version: string | undefined;

  constructor(created: Date, schemaVersion: string) {
    this.created = created;
    this.entries = {};
    this.schemaVersion = schemaVersion;
  }

  public static fromArtifacts(
    artifacts: InternalArtifactSchema[],
    schemaVersion: string
  ): Manifest {
    const manifest = new Manifest(Date.now(), schemaVersion);
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
    const entry = new ManifestEntry(artifact);
    this.entries[entry.getDocId()] = entry;
  }

  public contains(artifactId: string): boolean {
    return artifactId in this.entries;
  }

  public getEntries(): Record<string, ManifestEntry> {
    return this.entries;
  }

  public getArtifact(artifactId: string): InternalArtifactSchema {
    return this.entries[artifactId].getArtifact();
  }

  public copy(): Manifest {
    const manifest = new Manifest(this.created, this.schemaVersion);
    manifest.entries = { ...this.entries };
    manifest.version = this.version;
    return manifest;
  }

  public diff(manifest: Manifest): ManifestDiff[] {
    const diffs: ManifestDiff[] = [];

    for (const id in manifest.getEntries()) {
      if (!this.contains(id)) {
        diffs.push({ type: 'delete', id });
      }
    }

    for (const id in this.entries) {
      if (!manifest.contains(id)) {
        diffs.push({ type: 'add', id });
      }
    }

    return diffs;
  }

  public toEndpointFormat(): ManifestSchema {
    const manifestObj: object = {
      manifestVersion: 'todo',
      schemaVersion: 'todo',
      artifacts: {},
    };

    for (const entry of Object.values(this.entries)) {
      manifestObj.artifacts[entry.getIdentifier()] = entry.getRecord();
    }

    return manifestObj as ManifestSchema;
  }

  public toSavedObject(): InternalManifestSchema {
    return {
      created: this.created,
      ids: Object.keys(this.entries),
    };
  }
}
