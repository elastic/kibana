/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { CsvImporter } from './csv_importer';
import { SstImporter } from './sst_importer';
import { JsonImporter } from './json_importer';

export function importerFactory(format, results) {

  switch (format) {
    case 'delimited':
      return new CsvImporter(results);
    case 'semi_structured_text':
      return new SstImporter(results);
    case 'json':
      return new JsonImporter(results);
    default:
      return;
  }
}
