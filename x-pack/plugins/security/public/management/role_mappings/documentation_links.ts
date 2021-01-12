/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationLinksService {
  private readonly mappingRoles: string;
  private readonly createRoleMapping: string;
  private readonly createRoleMappingTemplates: string;
  private readonly roleMappingFieldRules: string;

  constructor(docLinks: DocLinksStart) {
    this.mappingRoles = `${docLinks.links.security.mappingRoles}`;
    this.createRoleMapping = `${docLinks.links.apis.createRoleMapping}`;
    this.createRoleMappingTemplates = `${docLinks.links.apis.createRoleMappingTemplates}`;
    this.roleMappingFieldRules = `${docLinks.links.security.mappingRolesFieldRules}`;
  }

  public getRoleMappingDocUrl() {
    return `${this.mappingRoles}`;
  }

  public getRoleMappingAPIDocUrl() {
    return `${this.createRoleMapping}`;
  }

  public getRoleMappingTemplateDocUrl() {
    return `${this.createRoleMappingTemplates}`;
  }

  public getRoleMappingFieldRulesDocUrl() {
    return `${this.roleMappingFieldRules}`;
  }
}
