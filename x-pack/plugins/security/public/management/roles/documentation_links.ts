/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly esClusterPrivileges: string;
  private readonly esRunAsPrivilege: string;
  private readonly esIndicesPrivileges: string;

  constructor(docLinks: DocLinksStart) {
    this.esClusterPrivileges = `${docLinks.links.security.clusterPrivileges}`;
    this.esRunAsPrivilege = `${docLinks.links.security.runAsPrivilege}`;
    this.esIndicesPrivileges = `${docLinks.links.security.indicesPrivileges}`;
  }

  public getESClusterPrivilegesDocUrl() {
    return `${this.esClusterPrivileges}`;
  }

  public getESRunAsPrivilegesDocUrl() {
    return `${this.esRunAsPrivilege}`;
  }

  public getESIndicesPrivilegesDocUrl() {
    return `${this.esIndicesPrivileges}`;
  }
}
