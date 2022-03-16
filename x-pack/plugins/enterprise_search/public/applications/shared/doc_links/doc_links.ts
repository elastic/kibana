/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'kibana/public';

class DocLinks {
  public appSearchApis: string;
  public appSearchApiClients: string;
  public appSearchApiKeys: string;
  public appSearchAuthentication: string;
  public appSearchCrawlRules: string;
  public appSearchCurations: string;
  public appSearchDuplicateDocuments: string;
  public appSearchEntryPoints: string;
  public appSearchGuide: string;
  public appSearchIndexingDocs: string;
  public appSearchIndexingDocsSchema: string;
  public appSearchLogSettings: string;
  public appSearchMetaEngines: string;
  public appSearchPrecision: string;
  public appSearchRelevance: string;
  public appSearchResultSettings: string;
  public appSearchSearchUI: string;
  public appSearchSecurity: string;
  public appSearchSynonyms: string;
  public appSearchWebCrawler: string;
  public appSearchWebCrawlerEventLogs: string;
  public cloudIndexManagement: string;
  public enterpriseSearchConfig: string;
  public enterpriseSearchMailService: string;
  public enterpriseSearchTroubleshootSetup: string;
  public enterpriseSearchUsersAccess: string;
  public kibanaSecurity: string;
  public licenseManagement: string;
  public workplaceSearchApiKeys: string;
  public workplaceSearchBox: string;
  public workplaceSearchConfluenceCloud: string;
  public workplaceSearchConfluenceServer: string;
  public workplaceSearchCustomSources: string;
  public workplaceSearchCustomSourcePermissions: string;
  public workplaceSearchDocumentPermissions: string;
  public workplaceSearchDropbox: string;
  public workplaceSearchExternalSharePointOnline: string;
  public workplaceSearchExternalIdentities: string;
  public workplaceSearchGettingStarted: string;
  public workplaceSearchGitHub: string;
  public workplaceSearchGmail: string;
  public workplaceSearchGoogleDrive: string;
  public workplaceSearchIndexingSchedule: string;
  public workplaceSearchJiraCloud: string;
  public workplaceSearchJiraServer: string;
  public workplaceSearchOneDrive: string;
  public workplaceSearchPermissions: string;
  public workplaceSearchSalesforce: string;
  public workplaceSearchSecurity: string;
  public workplaceSearchServiceNow: string;
  public workplaceSearchSharePoint: string;
  public workplaceSearchSlack: string;
  public workplaceSearchSynch: string;
  public workplaceSearchZendesk: string;

  constructor() {
    this.appSearchApis = '';
    this.appSearchApiClients = '';
    this.appSearchApiKeys = '';
    this.appSearchAuthentication = '';
    this.appSearchCrawlRules = '';
    this.appSearchCurations = '';
    this.appSearchDuplicateDocuments = '';
    this.appSearchEntryPoints = '';
    this.appSearchGuide = '';
    this.appSearchIndexingDocs = '';
    this.appSearchIndexingDocsSchema = '';
    this.appSearchLogSettings = '';
    this.appSearchMetaEngines = '';
    this.appSearchPrecision = '';
    this.appSearchRelevance = '';
    this.appSearchResultSettings = '';
    this.appSearchSearchUI = '';
    this.appSearchSecurity = '';
    this.appSearchSynonyms = '';
    this.appSearchWebCrawler = '';
    this.appSearchWebCrawlerEventLogs = '';
    this.cloudIndexManagement = '';
    this.enterpriseSearchConfig = '';
    this.enterpriseSearchMailService = '';
    this.enterpriseSearchTroubleshootSetup = '';
    this.enterpriseSearchUsersAccess = '';
    this.kibanaSecurity = '';
    this.licenseManagement = '';
    this.workplaceSearchApiKeys = '';
    this.workplaceSearchBox = '';
    this.workplaceSearchConfluenceCloud = '';
    this.workplaceSearchConfluenceServer = '';
    this.workplaceSearchCustomSources = '';
    this.workplaceSearchCustomSourcePermissions = '';
    this.workplaceSearchDocumentPermissions = '';
    this.workplaceSearchDropbox = '';
    this.workplaceSearchExternalSharePointOnline = '';
    this.workplaceSearchExternalIdentities = '';
    this.workplaceSearchGettingStarted = '';
    this.workplaceSearchGitHub = '';
    this.workplaceSearchGmail = '';
    this.workplaceSearchGoogleDrive = '';
    this.workplaceSearchIndexingSchedule = '';
    this.workplaceSearchJiraCloud = '';
    this.workplaceSearchJiraServer = '';
    this.workplaceSearchOneDrive = '';
    this.workplaceSearchPermissions = '';
    this.workplaceSearchSalesforce = '';
    this.workplaceSearchSecurity = '';
    this.workplaceSearchServiceNow = '';
    this.workplaceSearchSharePoint = '';
    this.workplaceSearchSlack = '';
    this.workplaceSearchSynch = '';
    this.workplaceSearchZendesk = '';
  }

  public setDocLinks(docLinks: DocLinksStart): void {
    this.appSearchApis = docLinks.links.appSearch.apiRef;
    this.appSearchApiClients = docLinks.links.appSearch.apiClients;
    this.appSearchApiKeys = docLinks.links.appSearch.apiKeys;
    this.appSearchAuthentication = docLinks.links.appSearch.authentication;
    this.appSearchCrawlRules = docLinks.links.appSearch.crawlRules;
    this.appSearchCurations = docLinks.links.appSearch.curations;
    this.appSearchDuplicateDocuments = docLinks.links.appSearch.duplicateDocuments;
    this.appSearchEntryPoints = docLinks.links.appSearch.entryPoints;
    this.appSearchGuide = docLinks.links.appSearch.guide;
    this.appSearchIndexingDocs = docLinks.links.appSearch.indexingDocuments;
    this.appSearchIndexingDocsSchema = docLinks.links.appSearch.indexingDocumentsSchema;
    this.appSearchLogSettings = docLinks.links.appSearch.logSettings;
    this.appSearchMetaEngines = docLinks.links.appSearch.metaEngines;
    this.appSearchPrecision = docLinks.links.appSearch.precisionTuning;
    this.appSearchRelevance = docLinks.links.appSearch.relevanceTuning;
    this.appSearchResultSettings = docLinks.links.appSearch.resultSettings;
    this.appSearchSearchUI = docLinks.links.appSearch.searchUI;
    this.appSearchSecurity = docLinks.links.appSearch.security;
    this.appSearchSynonyms = docLinks.links.appSearch.synonyms;
    this.appSearchWebCrawler = docLinks.links.appSearch.webCrawler;
    this.appSearchWebCrawlerEventLogs = docLinks.links.appSearch.webCrawlerEventLogs;
    this.cloudIndexManagement = docLinks.links.cloud.indexManagement;
    this.enterpriseSearchConfig = docLinks.links.enterpriseSearch.configuration;
    this.enterpriseSearchMailService = docLinks.links.enterpriseSearch.mailService;
    this.enterpriseSearchTroubleshootSetup = docLinks.links.enterpriseSearch.troubleshootSetup;
    this.enterpriseSearchUsersAccess = docLinks.links.enterpriseSearch.usersAccess;
    this.kibanaSecurity = docLinks.links.kibana.xpackSecurity;
    this.licenseManagement = docLinks.links.enterpriseSearch.licenseManagement;
    this.workplaceSearchApiKeys = docLinks.links.workplaceSearch.apiKeys;
    this.workplaceSearchBox = docLinks.links.workplaceSearch.box;
    this.workplaceSearchConfluenceCloud = docLinks.links.workplaceSearch.confluenceCloud;
    this.workplaceSearchConfluenceServer = docLinks.links.workplaceSearch.confluenceServer;
    this.workplaceSearchCustomSources = docLinks.links.workplaceSearch.customSources;
    this.workplaceSearchCustomSourcePermissions =
      docLinks.links.workplaceSearch.customSourcePermissions;
    this.workplaceSearchDocumentPermissions = docLinks.links.workplaceSearch.documentPermissions;
    this.workplaceSearchDropbox = docLinks.links.workplaceSearch.dropbox;
    this.workplaceSearchExternalSharePointOnline =
      docLinks.links.workplaceSearch.externalSharePointOnline;
    this.workplaceSearchExternalIdentities = docLinks.links.workplaceSearch.externalIdentities;
    this.workplaceSearchGettingStarted = docLinks.links.workplaceSearch.gettingStarted;
    this.workplaceSearchGitHub = docLinks.links.workplaceSearch.gitHub;
    this.workplaceSearchGmail = docLinks.links.workplaceSearch.gmail;
    this.workplaceSearchGoogleDrive = docLinks.links.workplaceSearch.googleDrive;
    this.workplaceSearchIndexingSchedule = docLinks.links.workplaceSearch.indexingSchedule;
    this.workplaceSearchJiraCloud = docLinks.links.workplaceSearch.jiraCloud;
    this.workplaceSearchJiraServer = docLinks.links.workplaceSearch.jiraServer;
    this.workplaceSearchOneDrive = docLinks.links.workplaceSearch.oneDrive;
    this.workplaceSearchPermissions = docLinks.links.workplaceSearch.permissions;
    this.workplaceSearchSalesforce = docLinks.links.workplaceSearch.salesforce;
    this.workplaceSearchSecurity = docLinks.links.workplaceSearch.security;
    this.workplaceSearchServiceNow = docLinks.links.workplaceSearch.serviceNow;
    this.workplaceSearchSharePoint = docLinks.links.workplaceSearch.sharePoint;
    this.workplaceSearchSlack = docLinks.links.workplaceSearch.slack;
    this.workplaceSearchSynch = docLinks.links.workplaceSearch.synch;
    this.workplaceSearchZendesk = docLinks.links.workplaceSearch.zendesk;
  }
}

export const docLinks = new DocLinks();
