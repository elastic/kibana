/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities as UICapabilities } from '@kbn/core/types';
import { format as formatUrl } from 'url';
import util from 'util';
import type { ToolingLog } from '@kbn/tooling-log';
import type { FtrProviderContext } from '../ftr_provider_context';
import type { FeaturesService } from './features';
import { FeaturesProvider } from './features';

export interface BasicCredentials {
  username: string;
  password: string;
}

export enum GetUICapabilitiesFailureReason {
  RedirectedToSpaceSelector = 'Redirected to Space Selector',
  NotFound = 'Not Found',
}

interface GetUICapabilitiesResult {
  success: boolean;
  value?: UICapabilities;
  failureReason?: GetUICapabilitiesFailureReason;
}

export class UICapabilitiesService {
  private readonly log: ToolingLog;
  private readonly baseURL: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly featureService: FeaturesService;

  constructor(url: string, log: ToolingLog, featureService: FeaturesService) {
    this.log = log;
    this.baseURL = url;
    this.defaultHeaders = { 'kbn-xsrf': 'x-pack/ftr/services/ui_capabilities' };
    this.featureService = featureService;
  }

  public async get({
    credentials,
    spaceId,
  }: {
    credentials?: BasicCredentials;
    spaceId?: string;
  }): Promise<GetUICapabilitiesResult> {
    const features = await this.featureService.get();
    const applications = Object.values(features)
      .flatMap((feature) => feature.app)
      .filter((link) => !!link);

    const spaceUrlPrefix = spaceId ? `/s/${spaceId}` : '';
    this.log.debug(
      `requesting ${spaceUrlPrefix}/api/core/capabilities to parse the uiCapabilities`
    );
    const requestHeaders: Record<string, string> = credentials
      ? {
          Authorization: `Basic ${Buffer.from(
            `${credentials.username}:${credentials.password}`
          ).toString('base64')}`,
        }
      : {};
    const response = await fetch(`${this.baseURL}${spaceUrlPrefix}/api/core/capabilities`, {
      method: 'POST',
      body: JSON.stringify({ applications: [...applications, 'kibana:stack_management'] }),
      headers: {
        'content-type': 'application/json',
        ...this.defaultHeaders,
        ...requestHeaders,
      },
      redirect: 'manual',
    });

    if (response.status === 302 && response.headers.get('location') === '/spaces/space_selector') {
      return {
        success: false,
        failureReason: GetUICapabilitiesFailureReason.RedirectedToSpaceSelector,
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        failureReason: GetUICapabilitiesFailureReason.NotFound,
      };
    }

    const data = await response.json();

    if (response.status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${response.status} ${
          response.statusText
        }: ${util.inspect(data)}`
      );
    }

    return {
      success: true,
      value: data,
    };
  }
}

export function UICapabilitiesProvider(context: FtrProviderContext) {
  const log = context.getService('log');
  const config = context.getService('config');
  const noAuthUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: undefined,
  });

  return new UICapabilitiesService(noAuthUrl, log, FeaturesProvider(context));
}
