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
  public logStash: string = '';
  public metadata: string = '';
  public roleDescriptors: string = '';
  public securityApis: string = '';
  // Client links
  public elasticsearchClients: string = '';
  // go
  public goAdvancedConfig: string = '';
  public goApiReference: string | undefined = undefined;
  public goBasicConfig: string = '';
  public goClient: string = '';
  // javascript
  public jsApiReference: string = '';
  public jsAdvancedConfig: string = '';
  public jsBasicConfig: string = '';
  public jsClient: string = '';
  // php
  public phpAdvancedConfig: string = '';
  public phpApiReference: string | undefined = undefined;
  public phpBasicConfig: string = '';
  public phpClient: string = '';
  // python
  public pythonApiReference: string | undefined = undefined;
  public pythonAdvancedConfig: string = '';
  public pythonBasicConfig: string = '';
  public pythonClient: string = '';
  // ruby
  public rubyAdvancedConfig: string = '';
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
    this.kibanaFeedback = newDocLinks.kibana.feedback;
    this.kibanaRunApiInConsole = newDocLinks.console.serverlessGuide;
    this.metadata = newDocLinks.security.mappingRoles;
    this.roleDescriptors = newDocLinks.security.mappingRoles;
    this.securityApis = newDocLinks.apis.securityApis;

    // Client links
    this.elasticsearchClients = newDocLinks.serverlessClients.httpApis;
    // Go
    this.goAdvancedConfig = newDocLinks.clients.goConnecting;
    this.goApiReference = newDocLinks.serverlessClients.goApiReference;
    this.goBasicConfig = newDocLinks.clients.goGettingStarted;
    this.goClient = newDocLinks.serverlessClients.goGettingStarted;
    // JS
    this.jsAdvancedConfig = newDocLinks.clients.jsAdvancedConfig;
    this.jsApiReference = newDocLinks.serverlessClients.jsApiReference;
    this.jsBasicConfig = newDocLinks.clients.jsBasicConfig;
    this.jsClient = newDocLinks.serverlessClients.jsGettingStarted;
    // PHP
    this.phpAdvancedConfig = newDocLinks.clients.phpConfiguration;
    this.phpApiReference = newDocLinks.serverlessClients.phpApiReference;
    this.phpBasicConfig = newDocLinks.clients.phpConnecting;
    this.phpClient = newDocLinks.serverlessClients.phpGettingStarted;
    this.phpBasicConfig = newDocLinks.clients.phpConnecting;
    // Python
    this.pythonApiReference = newDocLinks.serverlessClients.pythonApiReference;
    this.pythonAdvancedConfig = newDocLinks.clients.pythonConfig;
    this.pythonBasicConfig = newDocLinks.clients.pythonConnecting;
    this.pythonClient = newDocLinks.serverlessClients.pythonGettingStarted;
    // Python
    this.rubyAdvancedConfig = newDocLinks.clients.rubyAdvancedConfig;
    this.rubyBasicConfig = newDocLinks.clients.rubyBasicConfig;
    this.rubyExamples = newDocLinks.serverlessClients.rubyApiReference;
    this.rubyClient = newDocLinks.serverlessClients.rubyGettingStarted;

    // Getting Started
    this.gettingStartedIngest = newDocLinks.serverlessSearch.gettingStartedIngest;
    this.gettingStartedSearch = newDocLinks.serverlessSearch.gettingStartedSearch;
    this.gettingStartedExplore = newDocLinks.serverlessSearch.gettingStartedExplore;
  }
}

export const docLinks = new ESDocLinks();
