/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DocLinksStart } from 'src/core/public';

export const getLinks = (docLinks: DocLinksStart) => {
  const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
  const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;
  const esDocsBase = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;
  const painlessDocsBase = `${docsBase}/elasticsearch/painless/${DOC_LINK_VERSION}`;

  return {
    runtimePainless: `${esDocsBase}/runtime.html#runtime-mapping-fields`,
    painlessSyntax: `${painlessDocsBase}/painless-lang-spec.html`,
  };
};
