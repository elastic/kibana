/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinks } from '@kbn/doc-links';

class ESDocLinks {
  public apiIntro: string = '';
  public beats: string = '';
  public connectors: string = '';
  public integrations: string = '';
  public kibanaFeedback: string = '';
  public kibanaRunApiInConsole: string = '';
  public logstash: string = '';
  public metadata: string = '';
  public roleDescriptors: string = '';
  public securityApis: string = '';
  // Client links
  public elasticsearchClients: string = '';
  // go
  public goApiReference: string | undefined = undefined;
  public goBasicConfig: string = '';
  public goClient: string = '';
  // javascript
  public jsApiReference: string = '';
  public jsBasicConfig: string = '';
  public jsClient: string = '';
  // php
  public phpApiReference: string | undefined = undefined;
  public phpBasicConfig: string = '';
  public phpClient: string = '';
  // python
  public pythonApiReference: string | undefined = undefined;
  public pythonBasicConfig: string = '';
  public pythonClient: string = '';
  // ruby
  public rubyBasicConfig: string = '';
  public rubyClient: string = '';
  public rubyExamples: string = '';

  // Getting Started
  public gettingStartedIngest: string = '';
  public gettingStartedSearch: string = '';
  public gettingStartedExplore: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.apiIntro = newDocLinks.serverlessClients.httpApis;
    this.integrations = newDocLinks.serverlessSearch.integrations;
    this.logstash = newDocLinks.serverlessSearch.integrationsLogstash;
    this.beats = newDocLinks.serverlessSearch.integrationsBeats;
    this.connectors = newDocLinks.serverlessSearch.integrationsConnectorClient;
    this.kibanaFeedback = newDocLinks.kibana.feedback;
    this.kibanaRunApiInConsole = newDocLinks.console.serverlessGuide;
    this.metadata = newDocLinks.security.mappingRoles;
    this.roleDescriptors = newDocLinks.serverlessSecurity.apiKeyPrivileges;
    this.securityApis = newDocLinks.apis.securityApis;

    // Client links
    this.elasticsearchClients = newDocLinks.serverlessClients.clientLib;
    // Go
    this.goApiReference = newDocLinks.serverlessClients.goApiReference;
    this.goBasicConfig = newDocLinks.serverlessClients.goGettingStarted;
    this.goClient = newDocLinks.serverlessClients.goGettingStarted;
    // JS
    this.jsApiReference = newDocLinks.serverlessClients.jsApiReference;
    this.jsBasicConfig = newDocLinks.serverlessClients.jsGettingStarted;
    this.jsClient = newDocLinks.serverlessClients.jsGettingStarted;
    // PHP
    this.phpApiReference = newDocLinks.serverlessClients.phpApiReference;
    this.phpBasicConfig = newDocLinks.serverlessClients.phpGettingStarted;
    this.phpClient = newDocLinks.serverlessClients.phpGettingStarted;
    // Python
    this.pythonApiReference = newDocLinks.serverlessClients.pythonGettingStarted;
    this.pythonBasicConfig = newDocLinks.serverlessClients.pythonGettingStarted;
    this.pythonClient = newDocLinks.serverlessClients.pythonGettingStarted;
    // Python
    this.rubyBasicConfig = newDocLinks.serverlessClients.rubyGettingStarted;
    this.rubyExamples = newDocLinks.serverlessClients.rubyApiReference;
    this.rubyClient = newDocLinks.serverlessClients.rubyGettingStarted;

    // Getting Started
    this.gettingStartedIngest = newDocLinks.serverlessSearch.gettingStartedIngest;
    this.gettingStartedSearch = newDocLinks.serverlessSearch.gettingStartedSearch;
    this.gettingStartedExplore = newDocLinks.serverlessSearch.gettingStartedExplore;
  }
}

export const docLinks = new ESDocLinks();
