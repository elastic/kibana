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
  public elasticsearchClients: string = '';
  public integrations: string = '';
  public goAdvancedConfig: string = '';
  public goBasicConfig: string = '';
  public goClient: string = '';
  public jsApiReference: string = '';
  public jsAdvancedConfig: string = '';
  public jsBasicConfig: string = '';
  public jsClient: string = '';
  public kibanaRunApiInConsole: string = '';
  public logStash: string = '';
  public metadata: string = '';
  public phpAdvancedConfig: string = '';
  public phpBasicConfig: string = '';
  public phpClient: string = '';
  public pythonAdvancedConfig: string = '';
  public pythonBasicConfig: string = '';
  public pythonClient: string = '';
  public roleDescriptors: string = '';
  public rubyAdvancedConfig: string = '';
  public rubyBasicConfig: string = '';
  public rubyClient: string = '';
  public rubyExamples: string = '';
  public securityApis: string = '';
  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.apiIntro = newDocLinks.apis.restApis;
    this.elasticsearchClients = newDocLinks.clients.guide;
    this.integrations = newDocLinks.serverlessSearch.integrations;
    this.goAdvancedConfig = newDocLinks.clients.goConnecting;
    this.goBasicConfig = newDocLinks.clients.goGettingStarted;
    this.goClient = newDocLinks.clients.goOverview;
    this.jsAdvancedConfig = newDocLinks.clients.jsAdvancedConfig;
    this.jsApiReference = newDocLinks.clients.jsApiReference;
    this.jsBasicConfig = newDocLinks.clients.jsBasicConfig;
    this.jsClient = newDocLinks.clients.jsIntro;
    this.kibanaRunApiInConsole = newDocLinks.console.guide;
    this.metadata = newDocLinks.security.mappingRoles;
    this.phpAdvancedConfig = newDocLinks.clients.phpConfiguration;
    this.phpBasicConfig = newDocLinks.clients.phpConnecting;
    this.phpClient = newDocLinks.clients.phpOverview;
    this.phpBasicConfig = newDocLinks.clients.phpConnecting;
    this.pythonAdvancedConfig = newDocLinks.clients.pythonConfig;
    this.pythonBasicConfig = newDocLinks.clients.pythonConnecting;
    this.pythonClient = newDocLinks.clients.pythonOverview;
    this.roleDescriptors = newDocLinks.security.mappingRoles;
    this.rubyAdvancedConfig = newDocLinks.clients.rubyAdvancedConfig;
    this.rubyBasicConfig = newDocLinks.clients.rubyBasicConfig;
    this.rubyExamples = newDocLinks.clients.rubyExamples;
    this.rubyClient = newDocLinks.clients.rubyOverview;
    this.securityApis = newDocLinks.apis.securityApis;
  }
}

export const docLinks = new ESDocLinks();
