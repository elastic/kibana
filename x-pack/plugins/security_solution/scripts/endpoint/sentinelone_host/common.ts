/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import type {
  S1SitesListApiResponse,
  S1AgentPackage,
  S1AgentPackageListApiResponse,
} from './types';
import { catchAxiosErrorFormatAndThrow } from '../common/format_axios_error';
import type { HostVm } from '../common/types';

interface S1ClientOptions {
  /** The base URL for SentinelOne */
  url: string;
  /** The API token that should be used to communicate with SentinelOne */
  apiToken: string;
  log?: ToolingLog;
}

export class S1Client {
  protected readonly API_SITES_PATH = '/web/api/v2.1/sites';
  protected readonly API_AGENT_PACKAGES_PATH = '/web/api/v2.1/update/agent/packages';

  protected readonly log: ToolingLog;
  protected readonly setup: Promise<{
    siteToken: string;
    siteId: string;
  }>;

  constructor(private readonly options: S1ClientOptions) {
    this.log = options.log ?? createToolingLogger();

    this.setup = this.request<S1SitesListApiResponse>({
      url: this.API_SITES_PATH,
      params: {
        isDefault: true,
      },
    }).then((response) => {
      this.log.verbose(response);

      const site = response.data.sites[0];

      if (!site) {
        throw new Error(
          `Unable to retrieve SentinelOne Site information. No default sites returned`
        );
      }

      return {
        siteToken: site.registrationToken,
        siteId: site.id,
      };
    });
  }

  protected async request<T = unknown>({
    url = '',
    params = {},
    ...options
  }: AxiosRequestConfig): Promise<T> {
    const apiFullUrl = this.buildUrl(url);

    const requestOptions: AxiosRequestConfig = {
      ...options,
      url: apiFullUrl,
      params: {
        APIToken: this.options.apiToken,
        ...params,
      },
    };

    this.log.debug(`Request: `, requestOptions);

    return axios
      .request<T>(requestOptions)
      .then((response) => {
        this.log.verbose(`Response: `, response);
        return response.data;
      })
      .catch(catchAxiosErrorFormatAndThrow);
  }

  public buildUrl(path: string): string {
    const uri = new URL(this.options.url);
    uri.pathname = path;
    return uri.toString();
  }

  public async getSiteToken(): Promise<string> {
    return this.setup.then(({ siteToken }) => siteToken);
  }

  public async getSiteId(): Promise<string> {
    return this.setup.then(({ siteId }) => siteId);
  }

  /**
   * Returns the Agent download url (including API key in the URL)
   * @param arch
   * @param osType
   * @param fileExtension
   */
  public async getAgentDownloadUrl({
    arch,
    osType = 'linux',
    fileExtension = '.deb',
  }: Partial<{
    arch: 'x86_64' | 'aarch64';
    osType: 'linux';
    fileExtension: '.deb';
  }> = {}): Promise<string> {
    const archType = arch || { arm64: 'aarch64', x64: 'x86_64' }[process.arch as string];

    const { data: allPackages } = await this.request<S1AgentPackageListApiResponse>({
      url: this.API_AGENT_PACKAGES_PATH,
      params: {
        packageTypes: 'Agent',
        osTypes: osType,
        siteIds: await this.getSiteId(),
        fileExtension,
        limit: 5,
        sortBy: 'version',
        sortOrder: 'desc',
      },
    });

    let agentPackage: S1AgentPackage | undefined;

    // Finds the correct package for the arch
    for (const thisPackage of allPackages) {
      if (thisPackage.fileName.includes(`_${archType}_`)) {
        agentPackage = thisPackage;
        break;
      }
    }

    if (!agentPackage) {
      throw new Error(
        `Unable to find a package for Agent using: arch[${archType}], osType[${osType}], fileExtension[${fileExtension}]`
      );
    }

    this.log.info(
      `Using SentinelOne agent package v${agentPackage.version} [${agentPackage.fileName}]:\n${agentPackage.link}`
    );
    this.log.debug('Agent package: ', agentPackage);

    return `${agentPackage.link}?APIToken=${this.options.apiToken}`;
  }
}

interface InstallSentinelOneAgentOptions {
  hostVm: HostVm;
  s1Client: S1Client;
  log?: ToolingLog;
}

interface InstallSentinelOneAgentResponse {
  path: string;
  status: string;
}

/**
 * Installs the SentinelOne Agent (owned by SentinelOne) on the given VM
 * @param hostVm
 * @param s1Client
 * @param log
 */
export const installSentinelOneAgent = async ({
  hostVm,
  s1Client,
  log = createToolingLogger(),
}: InstallSentinelOneAgentOptions): Promise<InstallSentinelOneAgentResponse> => {
  log.info(`Installing SentinelOne agent to VM [${hostVm.name}]`);

  const installPath = '/opt/sentinelone/bin/sentinelctl';

  return log.indent(4, async () => {
    const [siteToken, agentUrl] = await Promise.all([
      s1Client.getSiteToken(),
      s1Client.getAgentDownloadUrl(),
    ]);

    log.debug(`siteToken[ ${siteToken} ]\nagentURL[ ${agentUrl} ]`);
    log.info(`Downloading SentinelOne agent`);
    await hostVm.exec(`curl ${agentUrl} -o sentinel.deb`);

    log.info(`Installing agent and starting service`);
    await hostVm.exec(`sudo dpkg -i sentinel.deb`);
    await hostVm.exec(`sudo ${installPath} management token set ${siteToken}`);
    await hostVm.exec(`sudo ${installPath} control start`);

    const status = (await hostVm.exec(`sudo ${installPath} control status`)).stdout;

    log.info('done');

    return {
      path: installPath,
      status,
    };
  });
};
