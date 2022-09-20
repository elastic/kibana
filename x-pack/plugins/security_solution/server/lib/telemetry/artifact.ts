

import axios from "axios";
import { ITelemetryReceiver } from "./receiver";
import { ESClusterInfo } from "./types";
import AdmZip from 'adm-zip';


export interface IArtifact {
  start(receiver: ITelemetryReceiver, logger: Logger): Promise<void>;
  getArtifact(name: string): Promise<unknown>;
}

class Artifact implements IArtifact {
  private manifestUrl?: string;
  private readonly CDN_URL = 'https://artifacts.security.elastic.co';
  //private readonly STAGING_CDN_URL = 'https://artifacts.security.elastic.co/downloads/endpoint/manifest/artifacts-8.4.0.zip';
  private readonly AXIOS_TIMEOUT_MS = 10_000;
  private receiver?: ITelemetryReceiver;
  private esClusterInfo?: ESClusterInfo;

  public async start(receiver: ITelemetryReceiver) {
    this.receiver = receiver;
    this.esClusterInfo = await this.receiver.fetchClusterInfo();
    const version = this.esClusterInfo?.version?.number;
    this.manifestUrl = `${this.CDN_URL}/downloads/endpoint/manifest/artifacts-${version}.zip`;
  }


  public async getArtifact(name: string): Promise<unknown> {
    try {
      if (this.manifestUrl) {
        const response = await axios.get(this.manifestUrl, { timeout: this.AXIOS_TIMEOUT_MS, responseType: 'arraybuffer' });
        const zip = new AdmZip(response.data);
        const entries = zip.getEntries();
        const manifest = JSON.parse(entries[0].getData().toString());
        const relativeUrl = manifest['artifacts'][name]['relative_url'];
        if (relativeUrl) {
          const url = `${this.CDN_URL}/${relativeUrl}`;
          const artifactResponse = await axios.get(url, { timeout: this.AXIOS_TIMEOUT_MS });
          return artifactResponse.data;
        } else {
          throw Error(`No artifact for name ${name}`);
        }
      } else {
        throw Error('No manifest url');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

}

export const artifactService = new Artifact();
