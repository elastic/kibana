/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'kibana/public';

export class AsyncSearchIntroDocumentation {
  private docsBasePath: string = '';

  constructor(docs: DocLinksStart) {
    const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docs;
    const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;
    // TODO: There should be Kibana documentation link about Search Sessions in Kibana
    this.docsBasePath = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;
  }

  public getElasticsearchDocLink() {
    return `${this.docsBasePath}/async-search-intro.html`;
  }
}
