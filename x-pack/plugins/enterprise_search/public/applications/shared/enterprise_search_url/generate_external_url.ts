/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Small helper for generating external public-facing URLs
 * to the legacy/standalone Enterprise Search app
 */
export interface IExternalUrl {
  enterpriseSearchUrl?: string;
  getAppSearchUrl(path?: string): string;
  getWorkplaceSearchUrl(path?: string): string;
}

export class ExternalUrl {
  public enterpriseSearchUrl: string;

  constructor(externalUrl: string) {
    this.enterpriseSearchUrl = externalUrl;

    this.getAppSearchUrl = this.getAppSearchUrl.bind(this);
    this.getWorkplaceSearchUrl = this.getWorkplaceSearchUrl.bind(this);
  }

  private getExternalUrl(path: string): string {
    return this.enterpriseSearchUrl + path;
  }

  public getAppSearchUrl(path: string = ''): string {
    return this.getExternalUrl('/as' + path);
  }

  public getWorkplaceSearchUrl(path: string = ''): string {
    return this.getExternalUrl('/ws' + path);
  }
}
