/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DocLinksStart } from 'src/core/public';

export class DocumentationService {
  private esDocBasePath: string = '';

  public setup(docLinks: DocLinksStart): void {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
    const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;

    this.esDocBasePath = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;
  }

  public getEsDocsBasePath() {
    return this.esDocBasePath;
  }

  public getIngestNodeUrl() {
    return `${this.esDocBasePath}/ingest.html`;
  }

  public getProcessorsUrl() {
    return `${this.esDocBasePath}/ingest-processors.html`;
  }

  public getHandlingFailureUrl() {
    return `${this.esDocBasePath}/handling-failure-in-pipelines.html`;
  }

  public getPutPipelineApiUrl() {
    return `${this.esDocBasePath}/put-pipeline-api.html`;
  }

  public getSimulatePipelineApiUrl() {
    return `${this.esDocBasePath}/simulate-pipeline-api.html`;
  }
}

export const documentationService = new DocumentationService();
