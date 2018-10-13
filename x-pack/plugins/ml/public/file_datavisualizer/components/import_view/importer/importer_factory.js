/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { CsvImporter } from './csv_importer';
import { SstImporter } from './sst_importer';
import { JsonImporter } from './json_importer';

export function importerFactory(format, results) {

  let importer;
  switch (format) {
    case 'delimited':
      importer = new CsvImporter(results);
      break;
    case 'semi_structured_text':
      importer = new SstImporter(results);
      break;
    case 'json':
      importer = new JsonImporter(results);
      break;
    default:
      break;
  }
  return importer;
}
