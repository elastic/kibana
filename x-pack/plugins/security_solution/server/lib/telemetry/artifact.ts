import axios from "axios";
import { ITelemetryReceiver } from "./receiver";
import { ESClusterInfo } from "./types";


export interface IArtifact {
  start(receiver: ITelemetryReceiver): Promise<void>;
  getArtifact(): Promise<unknown>;
}

class Artifact implements IArtifact {
  private url?: string;
  private readonly PROD_CDN_URL = 'https://artifacts.security.elastic.co/downloads/endpoint/manifest';
  //private readonly STAGING_CDN_URL = 'https://artifacts.security.elastic.co/downloads/endpoint/manifest/artifacts-8.4.0.zip';
  private readonly AXIOS_TIMEOUT_MS = 10_000;
  private receiver?: ITelemetryReceiver;
  private esClusterInfo?: ESClusterInfo;

  public async start(receiver: ITelemetryReceiver) {
    this.receiver = receiver;
    this.esClusterInfo = await this.receiver.fetchClusterInfo();
    const version = this.esClusterInfo?.version?.number;
    this.url = `${this.PROD_CDN_URL}/artifacts-${version}.zip`;
  }


  public async getArtifact(): Promise<unknown> {
    try {
      if (this.url) {
        const response = await axios.get(this.url, { timeout: this.AXIOS_TIMEOUT_MS });
        return response.data;
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }


}

export const artifactService = new Artifact();
