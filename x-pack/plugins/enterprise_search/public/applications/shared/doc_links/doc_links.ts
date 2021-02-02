/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'kibana/public';

class DocLinks {
  public enterpriseSearchBase: string;
  public appSearchBase: string;
  public workplaceSearchBase: string;
  public cloudBase: string;

  constructor() {
    this.enterpriseSearchBase = '';
    this.appSearchBase = '';
    this.workplaceSearchBase = '';
    this.cloudBase = '';
  }

  public setDocLinks(docLinks: DocLinksStart): void {
    this.enterpriseSearchBase = docLinks.links.enterpriseSearch.base;
    this.appSearchBase = docLinks.links.enterpriseSearch.appSearchBase;
    this.workplaceSearchBase = docLinks.links.enterpriseSearch.workplaceSearchBase;
    this.cloudBase = `${docLinks.ELASTIC_WEBSITE_URL}guide/en/cloud/current`;
  }
}

export const docLinks = new DocLinks();
