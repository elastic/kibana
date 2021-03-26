/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'src/core/public';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getDocumentation = ({ ELASTICSEARCH_DOCS, links }: DocLinksStart) => {
  const esDocsBase = `${ELASTICSEARCH_DOCS}`;
  return {
    esDocsBase,
    componentTemplates: links.apis.putComponentTemplate,
    componentTemplatesMetadata: links.apis.putComponentTemplateMetadata,
  };
};
