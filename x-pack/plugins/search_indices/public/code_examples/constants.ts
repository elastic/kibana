/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSTALL_INSTRUCTIONS_TITLE = i18n.translate(
  'xpack.searchIndices.code.installCommand.title',
  {
    defaultMessage: 'Install Elasticsearch client',
  }
);

export const INSTALL_INSTRUCTIONS_DESCRIPTION = i18n.translate(
  'xpack.searchIndices.code.installCommand.title',
  {
    defaultMessage: 'In your terminal, install the Elasticsearch client:',
  }
);

export const CONNECT_CREATE_VECTOR_INDEX_CMD_TITLE = i18n.translate(
  'xpack.searchIndices.code.createIndexCommand.title',
  {
    defaultMessage: 'Create an index with dense vector fields',
  }
);

export const CONNECT_CREATE_VECTOR_INDEX_CMD_DESCRIPTION = i18n.translate(
  'xpack.searchIndices.code.createIndexCommand.description',
  {
    defaultMessage: 'Use the Elasticsearch client to create an index with dense vector fields',
  }
);
