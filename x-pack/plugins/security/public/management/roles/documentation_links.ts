/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly esDocBasePath: string;

  constructor(docLinks: DocLinksStart) {
    this.esDocBasePath = `${docLinks.ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${docLinks.DOC_LINK_VERSION}/`;
  }

  public getESClusterPrivilegesDocUrl() {
    return `${this.esDocBasePath}security-privileges.html#privileges-list-cluster`;
  }

  public getESRunAsPrivilegesDocUrl() {
    return `${this.esDocBasePath}security-privileges.html#_run_as_privilege`;
  }

  public getESIndicesPrivilegesDocUrl() {
    return `${this.esDocBasePath}security-privileges.html#privileges-list-indices`;
  }
}
