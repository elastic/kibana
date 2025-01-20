/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestStream } from './ingest_stream';

export const ingestReadStream = {
  ...ingestStream,
  lifecycle: { type: 'dlm' },
  inherited_fields: {
    '@timestamp': {
      type: 'date',
      from: 'logs',
    },
    message: {
      type: 'match_only_text',
      from: 'logs',
    },
  },
};
