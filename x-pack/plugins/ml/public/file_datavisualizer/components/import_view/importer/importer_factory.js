/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { CsvImporter } from './csv_importer';
import { SstImporter } from './sst_importer';
import { NdjsonImporter } from './ndjson_importer';

export function importerFactory(format, results, settings) {

  switch (format) {
    case 'delimited':
      return new CsvImporter(results, settings);
    case 'semi_structured_text':
      return new SstImporter(results, settings);
    case 'ndjson':
      return new NdjsonImporter(results, settings);
    default:
      return;
  }
}
