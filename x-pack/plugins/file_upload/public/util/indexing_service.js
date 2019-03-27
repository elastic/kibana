/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fileToImport } from '../components/file_upload_and_parse';

export async function indexingService() {
  if (!fileToImport) {
    throw('No file imported');
    return;
  }

}
