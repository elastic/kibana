/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'src/core/public';

export class DocumentationService {
  private esDocBasePath: string = '';
  private ingestNodeUrl: string = '';
  private processorsUrl: string = '';
  private handlingFailureUrl: string = '';
  private putPipelineApiUrl: string = '';

  public setup(docLinks: DocLinksStart): void {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL, links } = docLinks;
    const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;

    this.esDocBasePath = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;
    this.ingestNodeUrl = `${links.ingest.pipelines}`;
    this.processorsUrl = `${links.ingest.processors}`;
    this.handlingFailureUrl = `${links.ingest.pipelineFailure}`;
    this.putPipelineApiUrl = `${links.apis.createPipeline}`;
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

  public getPutPipelineApiUrl() {
    return this.putPipelineApiUrl;
  }
}

export const documentationService = new DocumentationService();
