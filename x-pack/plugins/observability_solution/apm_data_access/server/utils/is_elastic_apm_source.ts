/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticAPMDocument,
  OTelAPMDocument,
} from '../lib/helpers/create_es_client/create_apm_event_client';

export function isElasticApmSource(
  document: OTelAPMDocument | ElasticAPMDocument
): document is ElasticAPMDocument {
  return (
    'span' in document ||
    'transaction' in document ||
    'error' in document ||
    ('processor' in document && 'event' in document.processor)
  );
}
