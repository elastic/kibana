/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import AdmZip from 'adm-zip';
import type { ITelemetryReceiver } from './receiver';
import type { ESClusterInfo } from './types';

export interface IArtifact {
  start(receiver: ITelemetryReceiver): Promise<void>;
  getArtifact(name: string): Promise<unknown>;
  getManifestUrl(): string | undefined;
}

export class Artifact implements IArtifact {
  private manifestUrl?: string;
  private readonly CDN_URL = 'https://artifacts.security.elastic.co';
  private readonly AXIOS_TIMEOUT_MS = 10_000;
  private receiver?: ITelemetryReceiver;
  private esClusterInfo?: ESClusterInfo;

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

  public async getArtifact(name: string): Promise<unknown> {
    if (this.manifestUrl) {
      const response = await axios.get(this.manifestUrl, {
        timeout: this.AXIOS_TIMEOUT_MS,
        responseType: 'arraybuffer',
      });
      const zip = new AdmZip(response.data);
      const entries = zip.getEntries();
      const manifest = JSON.parse(entries[0].getData().toString());
      const relativeUrl = manifest.artifacts[name]?.relative_url;
      if (relativeUrl) {
        const url = `${this.CDN_URL}${relativeUrl}`;
        const artifactResponse = await axios.get(url, { timeout: this.AXIOS_TIMEOUT_MS });
        return artifactResponse.data;
      } else {
        throw Error(`No artifact for name ${name}`);
      }
    } else {
      throw Error(`No manifest url for version ${this.esClusterInfo?.version?.number}`);
    }
  }

  public getManifestUrl() {
    return this.manifestUrl;
  }
}

export const artifactService = new Artifact();
