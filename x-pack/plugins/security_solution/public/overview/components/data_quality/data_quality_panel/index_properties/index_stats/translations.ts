/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_DOCS_COUNT_TOOL_TIP = (indexName: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexDocsCountToolTip', {
    values: { indexName },
    defaultMessage: 'A count of the docs in the {indexName} index',
  });

export const INDEX_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.dataQuality.indexesNameLabel',
  {
    defaultMessage: 'Index name',
  }
);

export const INDEX_TOOL_TIP = (pattern: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexToolTip', {
    values: { pattern },
    defaultMessage: 'This index matches the pattern or index name: {pattern}',
  });

export const DOCS_COUNT_LABEL = i18n.translate(
  'xpack.securitySolution.dataQuality.docsCountLabel',
  {
    defaultMessage: 'Docs',
  }
);

export const STORAGE_SIZE_LABEL = i18n.translate(
  'xpack.securitySolution.dataQuality.storageSizeLabel',
  {
    defaultMessage: 'Storage size',
  }
);
