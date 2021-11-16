/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'kibana/public';

class DocLinks {
  public enterpriseSearchBase: string;
  public appSearchBase: string;
  public workplaceSearchBase: string;
  public cloudBase: string;
  public workplaceSearchPermissions: string;
  public workplaceSearchDocumentPermissions: string;
  public workplaceSearchExternalIdentities: string;
  public workplaceSearchSecurity: string;
  public workplaceSearchBox: string;
  public workplaceSearchConfluenceCloud: string;
  public workplaceSearchConfluenceServer: string;
  public workplaceSearchDropbox: string;
  public workplaceSearchGitHub: string;
  public workplaceSearchGmail: string;
  public workplaceSearchGoogleDrive: string;
  public workplaceSearchJiraCloud: string;
  public workplaceSearchJiraServer: string;
  public workplaceSearchOneDrive: string;

  constructor() {
    this.enterpriseSearchBase = '';
    this.appSearchBase = '';
    this.workplaceSearchBase = '';
    this.cloudBase = '';
    this.workplaceSearchPermissions = '';
    this.workplaceSearchDocumentPermissions = '';
    this.workplaceSearchExternalIdentities = '';
    this.workplaceSearchSecurity = '';
    this.workplaceSearchBox = '';
    this.workplaceSearchConfluenceCloud = '';
    this.workplaceSearchConfluenceServer = '';
    this.workplaceSearchDropbox = '';
    this.workplaceSearchGitHub = '';
    this.workplaceSearchGmail = '';
    this.workplaceSearchGoogleDrive = '';
    this.workplaceSearchJiraCloud = '';
    this.workplaceSearchJiraServer = '';
    this.workplaceSearchOneDrive = '';
  }

  public setDocLinks(docLinks: DocLinksStart): void {
    this.enterpriseSearchBase = docLinks.links.enterpriseSearch.base;
    this.appSearchBase = docLinks.links.enterpriseSearch.appSearchBase;
    this.workplaceSearchBase = docLinks.links.enterpriseSearch.workplaceSearchBase;
    this.cloudBase = `${docLinks.ELASTIC_WEBSITE_URL}guide/en/cloud/current`;
    this.workplaceSearchPermissions = docLinks.links.enterpriseSearch.workplaceSearchPermissions;
    this.workplaceSearchDocumentPermissions =
      docLinks.links.enterpriseSearch.workplaceSearchDocumentPermissions;
    this.workplaceSearchExternalIdentities =
      docLinks.links.enterpriseSearch.workplaceSearchExternalIdentities;
    this.workplaceSearchSecurity = docLinks.links.enterpriseSearch.workplaceSearchSecurity;
    this.workplaceSearchBox = docLinks.links.enterpriseSearch.workplaceSearchBox;
    this.workplaceSearchConfluenceCloud =
      docLinks.links.enterpriseSearch.workplaceSearchConfluenceCloud;
    this.workplaceSearchConfluenceServer =
      docLinks.links.enterpriseSearch.workplaceSearchConfluenceServer;
    this.workplaceSearchDropbox = docLinks.links.enterpriseSearch.workplaceSearchDropbox;
    this.workplaceSearchGitHub = docLinks.links.enterpriseSearch.workplaceSearchGitHub;
    this.workplaceSearchGmail = docLinks.links.enterpriseSearch.workplaceSearchGmail;
    this.workplaceSearchGoogleDrive = docLinks.links.enterpriseSearch.workplaceSearchGoogleDrive;
    this.workplaceSearchJiraCloud = docLinks.links.enterpriseSearch.workplaceSearchJiraCloud;
    this.workplaceSearchJiraServer = docLinks.links.enterpriseSearch.workplaceSearchJiraServer;
    this.workplaceSearchOneDrive = docLinks.links.enterpriseSearch.workplaceSearchOneDrive;
  }
}

export const docLinks = new DocLinks();
