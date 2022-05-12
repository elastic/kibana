/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '@kbn/core/public';

export class DocumentationService {
  private esDocBasePath: string = '';
  private ingestNodeUrl: string = '';
  private processorsUrl: string = '';
  private handlingFailureUrl: string = '';
  private createPipelineUrl: string = '';
  private createPipelineCSVUrl: string = '';
  private simulatePipelineApiUrl: string = '';
  private enrichDataUrl: string = '';
  private geoMatchUrl: string = '';
  private dissectKeyModifiersUrl: string = '';
  private classificationUrl: string = '';
  private regressionUrl: string = '';
  private documentationUrl: string = '';

  public setup(docLinks: DocLinksStart): void {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL, links } = docLinks;
    const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;

    this.esDocBasePath = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;
    this.ingestNodeUrl = links.ingest.pipelines;
    this.processorsUrl = links.ingest.processors;
    this.handlingFailureUrl = links.ingest.pipelineFailure;
    this.createPipelineUrl = links.ingest.pipelines;
    this.createPipelineCSVUrl = links.ingest.csvPipelines;
    this.simulatePipelineApiUrl = links.apis.simulatePipeline;
    this.enrichDataUrl = links.ingest.enrich;
    this.geoMatchUrl = links.ingest.geoMatch;
    this.dissectKeyModifiersUrl = links.ingest.dissectKeyModifiers;
    this.classificationUrl = links.ingest.inferenceClassification;
    this.regressionUrl = links.ingest.inferenceRegression;
    this.documentationUrl = links.ingest.inference;
  }

  public getEsDocsBasePath() {
    return this.esDocBasePath;
  }

  public getIngestNodeUrl() {
    return this.ingestNodeUrl;
  }

  public getProcessorsUrl() {
    return this.processorsUrl;
  }

  public getHandlingFailureUrl() {
    return this.handlingFailureUrl;
  }

  public getCreatePipelineUrl() {
    return this.createPipelineUrl;
  }

  public getCreatePipelineCSVUrl() {
    return this.createPipelineCSVUrl;
  }

  public getSimulatePipelineApiUrl() {
    return this.simulatePipelineApiUrl;
  }

  public getEnrichDataUrl() {
    return this.enrichDataUrl;
  }

  public getGeoMatchUrl() {
    return this.geoMatchUrl;
  }

  public getDissectKeyModifiersUrl() {
    return this.dissectKeyModifiersUrl;
  }

  public getClassificationUrl() {
    return this.classificationUrl;
  }

  public getRegressionUrl() {
    return this.regressionUrl;
  }

  public getDocumentationUrl() {
    return this.documentationUrl;
  }
}

export const documentationService = new DocumentationService();
