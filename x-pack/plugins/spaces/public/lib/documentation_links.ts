/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly kbnPrivileges: string;
  private readonly kbnLegacyUrlAliases: string;
  private readonly kbnDisableLegacyUrlAliasesApi: string;

  constructor(docLinks: DocLinksStart) {
    this.kbnPrivileges = docLinks.links.security.kibanaPrivileges;
    this.kbnLegacyUrlAliases = docLinks.links.spaces.kibanaLegacyUrlAliases;
    this.kbnDisableLegacyUrlAliasesApi = docLinks.links.spaces.kibanaDisableLegacyUrlAliasesApi;
  }

  public getKibanaPrivilegesDocUrl() {
    return this.kbnPrivileges;
  }

  public getKibanaLegacyUrlAliasesDocUrl() {
    return this.kbnLegacyUrlAliases;
  }

  public getKibanaDisableLegacyUrlAliasesApiDocUrl() {
    return this.kbnDisableLegacyUrlAliasesApi;
  }
}
