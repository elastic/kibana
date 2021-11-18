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
  public workplaceSearchIndexingSchedule: string;
  public workplaceSearchJiraCloud: string;
  public workplaceSearchJiraServer: string;
  public workplaceSearchOneDrive: string;
  public workplaceSearchSalesforce: string;
  public workplaceSearchServiceNow: string;
  public workplaceSearchSharePoint: string;
  public workplaceSearchSlack: string;
  public workplaceSearchZendesk: string;
  public workplaceSearchCustomSources: string;
  public workplaceSearchCustomSourcePermissions: string;
  public licenseManagement: string;
  public workplaceSearchSynch: string;

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
    this.workplaceSearchIndexingSchedule = '';
    this.workplaceSearchJiraCloud = '';
    this.workplaceSearchJiraServer = '';
    this.workplaceSearchOneDrive = '';
    this.workplaceSearchSalesforce = '';
    this.workplaceSearchServiceNow = '';
    this.workplaceSearchSharePoint = '';
    this.workplaceSearchSlack = '';
    this.workplaceSearchZendesk = '';
    this.workplaceSearchCustomSources = '';
    this.workplaceSearchCustomSourcePermissions = '';
    this.licenseManagement = '';
    this.workplaceSearchSynch = '';
  }

  public setDocLinks(docLinks: DocLinksStart): void {
    this.enterpriseSearchBase = docLinks.links.enterpriseSearch.base;
    this.appSearchBase = docLinks.links.enterpriseSearch.appSearchBase;
    this.workplaceSearchBase = docLinks.links.workplaceSearch.base;
    this.cloudBase = `${docLinks.ELASTIC_WEBSITE_URL}guide/en/cloud/current`;
    this.workplaceSearchPermissions = docLinks.links.workplaceSearch.permissions;
    this.workplaceSearchDocumentPermissions = docLinks.links.workplaceSearch.documentPermissions;
    this.workplaceSearchExternalIdentities = docLinks.links.workplaceSearch.externalIdentities;
    this.workplaceSearchSecurity = docLinks.links.workplaceSearch.security;
    this.workplaceSearchBox = docLinks.links.workplaceSearch.box;
    this.workplaceSearchConfluenceCloud = docLinks.links.workplaceSearch.confluenceCloud;
    this.workplaceSearchConfluenceServer = docLinks.links.workplaceSearch.confluenceServer;
    this.workplaceSearchDropbox = docLinks.links.workplaceSearch.dropbox;
    this.workplaceSearchGitHub = docLinks.links.workplaceSearch.gitHub;
    this.workplaceSearchGmail = docLinks.links.workplaceSearch.gmail;
    this.workplaceSearchGoogleDrive = docLinks.links.workplaceSearch.googleDrive;
    this.workplaceSearchIndexingSchedule = docLinks.links.workplaceSearch.indexingSchedule;
    this.workplaceSearchJiraCloud = docLinks.links.workplaceSearch.jiraCloud;
    this.workplaceSearchJiraServer = docLinks.links.workplaceSearch.jiraServer;
    this.workplaceSearchOneDrive = docLinks.links.workplaceSearch.oneDrive;
    this.workplaceSearchSalesforce = docLinks.links.workplaceSearch.salesforce;
    this.workplaceSearchServiceNow = docLinks.links.workplaceSearch.serviceNow;
    this.workplaceSearchSharePoint = docLinks.links.workplaceSearch.sharePoint;
    this.workplaceSearchSlack = docLinks.links.workplaceSearch.slack;
    this.workplaceSearchZendesk = docLinks.links.workplaceSearch.zendesk;
    this.workplaceSearchCustomSources = docLinks.links.workplaceSearch.customSources;
    this.workplaceSearchCustomSourcePermissions =
      docLinks.links.workplaceSearch.customSourcePermissions;
    this.licenseManagement = docLinks.links.enterpriseSearch.licenseManagement;
    this.workplaceSearchSynch = docLinks.links.workplaceSearch.synch;
  }
}

export const docLinks = new DocLinks();
