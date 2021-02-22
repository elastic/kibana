/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageImporter } from './message_importer';
import { NdjsonImporter } from './ndjson_importer';
import { ImportFactoryOptions } from './types';

export function importerFactory(format: string, options: ImportFactoryOptions) {
  switch (format) {
    // delimited and semi-structured text are both handled by splitting the
    // file into messages, then sending these to ES for further processing
    // in an ingest pipeline in documents containing a single "message"
    // field (like Filebeat does)
    case 'delimited':
    case 'semi_structured_text':
      return new MessageImporter(options);
    case 'ndjson':
      return new NdjsonImporter();
    default:
      return;
  }
}
