/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly esDocBasePath: string;

  constructor(docLinks: DocLinksStart) {
    this.esDocBasePath = `${docLinks.ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${docLinks.DOC_LINK_VERSION}`;
  }

  public getEnableSecurityDocUrl() {
    return `${this.esDocBasePath}/get-started-enable-security.html?blade=kibanasecuritymessage`;
  }
}
