/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestGrokProcessor,
  IngestProcessorContainer,
  IngestRenameProcessor,
} from '@elastic/elasticsearch/lib/api/types';

export const createRenameProcessor = ({
  field,
  target_field: targetField,
}: Pick<IngestRenameProcessor, 'field' | 'target_field'>): Pick<
  IngestProcessorContainer,
  'rename'
> => ({
  rename: {
    field,
    target_field: targetField,
    ignore_failure: true,
    ignore_missing: true,
  },
});

export const createGrokProcessor = ({
  field,
  patterns,
}: Pick<IngestGrokProcessor, 'field' | 'patterns'>): Pick<IngestProcessorContainer, 'grok'> => ({
  grok: {
    field,
    patterns,
    ignore_failure: true,
    ignore_missing: true,
  },
});
