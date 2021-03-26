/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'kibana/public';

export class AsyncSearchIntroDocumentation {
  private docUrl: string = '';

  constructor(docs: DocLinksStart) {
    const { links } = docs;
    // TODO: There should be Kibana documentation link about Search Sessions in Kibana
    this.docUrl = links.elasticsearch.asyncSearch;
  }

  public getElasticsearchDocLink() {
    return `${this.docUrl}`;
  }
}
