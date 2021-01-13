/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly apiKeySettings: string;
  private readonly createApiKey: string;

  constructor(docLinks: DocLinksStart) {
    this.apiKeySettings = `${docLinks.links.security.apiKeyServiceSettings}`;
    this.createApiKey = `${docLinks.links.apis.createApiKey}`;
  }

  public getApiKeyServiceSettingsDocUrl() {
    return `${this.apiKeySettings}`;
  }

  public getCreateApiKeyDocUrl() {
    return `${this.createApiKey}`;
  }
}
