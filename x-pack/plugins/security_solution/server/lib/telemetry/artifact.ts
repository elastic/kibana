/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { cloneDeep } from 'lodash';
import AdmZip from 'adm-zip';
import type { ITelemetryReceiver } from './receiver';
import type { ESClusterInfo } from './types';

export interface IArtifact {
  start(receiver: ITelemetryReceiver): Promise<void>;
  getArtifact(name: string): Promise<Manifest>;
  getManifestUrl(): string | undefined;
}

export interface Manifest {
  data: unknown;
  notModified: boolean;
}

interface CacheEntry {
  manifest: Manifest;
  etag: string;
}

export class Artifact implements IArtifact {
  private manifestUrl?: string;
  private readonly CDN_URL = 'https://artifacts.security.elastic.co';
  private readonly AXIOS_TIMEOUT_MS = 10_000;
  private receiver?: ITelemetryReceiver;
  private esClusterInfo?: ESClusterInfo;
  private cache: Map<string, CacheEntry> = new Map();

  public async start(receiver: ITelemetryReceiver) {
    this.receiver = receiver;
    this.esClusterInfo = await this.receiver.fetchClusterInfo();
    if (this.esClusterInfo?.version?.number) {
      const version =
        this.esClusterInfo.version.number.substring(
          0,
          this.esClusterInfo.version.number.indexOf('-')
        ) || this.esClusterInfo.version.number;
      this.manifestUrl = `${this.CDN_URL}/downloads/kibana/manifest/artifacts-${version}.zip`;
    }
  }

  public async getArtifact(name: string): Promise<Manifest> {
    return axios
      .get(this.getManifestUrl(), {
        headers: this.headers(name),
        timeout: this.AXIOS_TIMEOUT_MS,
        validateStatus: (status) => status < 500,
        responseType: 'arraybuffer',
      })
      .then(async (response) => {
        switch (response.status) {
          case 200:
            const manifest = {
              data: await this.getManifest(name, response.data),
              notModified: false,
            };
            // only update etag if we got a valid manifest
            if (response.headers && response.headers.etag) {
              const cacheEntry = {
                manifest: { ...manifest, notModified: true },
                etag: response.headers?.etag ?? '',
              };
              this.cache.set(name, cacheEntry);
            }
            return cloneDeep(manifest);
          case 304:
            return cloneDeep(this.getCachedManifest(name));
          case 404:
            throw Error(`No manifest resource found at url: ${this.manifestUrl}`);
          default:
            throw Error(`Failed to download manifest, unexpected status code: ${response.status}`);
        }
      });
  }

  public getManifestUrl() {
    if (this.manifestUrl) {
      return this.manifestUrl;
    } else {
      throw Error(`No manifest url for version ${this.esClusterInfo?.version?.number}`);
    }
  }

  public getCachedManifest(name: string): Manifest {
    const entry = this.cache.get(name);
    if (!entry) {
      throw Error(`No cached manifest for name ${name}`);
    }
    return entry.manifest;
  }

  private async getManifest(name: string, data: Buffer): Promise<unknown> {
    const zip = new AdmZip(data);

    const manifestFile = zip.getEntries().find((entry) => {
      return entry.entryName === 'manifest.json';
    });

    if (!manifestFile) {
      throw Error('No manifest.json in artifact zip');
    }

    const manifest = JSON.parse(manifestFile.getData().toString());
    const relativeUrl = manifest.artifacts[name]?.relative_url;
    if (relativeUrl) {
      const url = `${this.CDN_URL}${relativeUrl}`;
      const artifactResponse = await axios.get(url, { timeout: this.AXIOS_TIMEOUT_MS });
      return artifactResponse.data;
    } else {
      throw Error(`No artifact for name ${name}`);
    }
  }

  // morre info https://www.rfc-editor.org/rfc/rfc9110#name-etag
  private headers(name: string): Record<string, string> {
    const etag = this.cache.get(name)?.etag;
    if (etag) {
      return { 'If-None-Match': etag };
    }
    return {};
  }
}

export const artifactService = new Artifact();
