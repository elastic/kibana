/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly kbn: string;

  constructor(docLinks: DocLinksStart) {
    this.kbn = `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/`;
  }

  public getKibanaPrivilegesDocUrl() {
    return `${this.kbn}kibana-privileges.html`;
  }
}
