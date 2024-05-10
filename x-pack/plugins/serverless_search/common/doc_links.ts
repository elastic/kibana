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
  public integrations: string = '';
  public kibanaFeedback: string = '';
  public kibanaRunApiInConsole: string = '';
  public logstash: string = '';
  public metadata: string = '';
  public roleDescriptors: string = '';
  public securityApis: string = '';
  public ingestionPipelines: string = '';
  public dataStreams: string = '';
  // Connectors links
  public connectors: string = '';
  public connectorClientAvailableConnectors: string = '';
  public connectorsRunFromSource: string = '';
  public connectorsRunWithDocker: string = '';
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

  // Ingest processor
  public dataEnrichment: string = '';
  public dataFiltering: string = '';
  public arrayOrJson: string = '';
  public dataTransformation: string = '';
  public pipelineHandling: string = '';
  public pipelines: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.apiIntro = newDocLinks.serverlessClients.httpApis;
    this.integrations = newDocLinks.serverlessSearch.integrations;
    this.logstash = newDocLinks.serverlessSearch.integrationsLogstash;
    this.beats = newDocLinks.serverlessSearch.integrationsBeats;
    this.kibanaFeedback = newDocLinks.kibana.feedback;
    this.kibanaRunApiInConsole = newDocLinks.console.serverlessGuide;
    this.metadata = newDocLinks.security.mappingRoles;
    this.roleDescriptors = newDocLinks.serverlessSecurity.apiKeyPrivileges;
    this.securityApis = newDocLinks.apis.securityApis;
    this.ingestionPipelines = newDocLinks.ingest.pipelines;
    this.dataStreams = newDocLinks.elasticsearch.dataStreams;

    // Connectors links
    this.connectors = newDocLinks.serverlessSearch.integrationsConnectorClient;
    this.connectorClientAvailableConnectors =
      newDocLinks.serverlessSearch.integrationsConnectorClientAvailableConnectors;
    this.connectorsRunFromSource =
      newDocLinks.serverlessSearch.integrationsConnectorClientRunFromSource;
    this.connectorsRunWithDocker =
      newDocLinks.serverlessSearch.integrationsConnectorClientRunWithDocker;

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
    // Ruby
    this.rubyBasicConfig = newDocLinks.serverlessClients.rubyGettingStarted;
    this.rubyExamples = newDocLinks.serverlessClients.rubyApiReference;
    this.rubyClient = newDocLinks.serverlessClients.rubyGettingStarted;

    // Getting Started
    this.gettingStartedIngest = newDocLinks.serverlessSearch.gettingStartedIngest;
    this.gettingStartedSearch = newDocLinks.serverlessSearch.gettingStartedSearch;
    this.gettingStartedExplore = newDocLinks.serverlessSearch.gettingStartedExplore;

    // Ingest processor
    this.dataEnrichment = newDocLinks.ingest.dataEnrichment;
    this.dataFiltering = newDocLinks.ingest.dataFiltering;
    this.arrayOrJson = newDocLinks.ingest.arrayOrJson;
    this.dataTransformation = newDocLinks.ingest.dataTransformation;
    this.pipelineHandling = newDocLinks.ingest.pipelineHandling;
    this.pipelines = newDocLinks.ingest.pipelines;
  }
}

export const docLinks = new ESDocLinks();
