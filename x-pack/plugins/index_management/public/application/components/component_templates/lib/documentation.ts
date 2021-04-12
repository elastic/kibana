/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'src/core/public';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getDocumentation = ({ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }: DocLinksStart) => {
  const docsBase = `${ELASTIC_WEBSITE_URL}guide/en`;
  const esDocsBase = `${docsBase}/elasticsearch/reference/${DOC_LINK_VERSION}`;

  return {
    esDocsBase,
    componentTemplates: `${esDocsBase}/indices-component-template.html`,
    componentTemplatesMetadata: `${esDocsBase}/indices-component-template.html#component-templates-metadata`,
  };
};
