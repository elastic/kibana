/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export const getDocumentation = ({ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }: DocLinksStart) => {
  const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;
  const esDocsBase = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;

  return {
    esDocsBase,
    componentTemplates: `${esDocsBase}/indices-component-template.html`,
    componentTemplatesMetadata: `${esDocsBase}/indices-component-template.html#component-templates-metadata`,
  };
};
