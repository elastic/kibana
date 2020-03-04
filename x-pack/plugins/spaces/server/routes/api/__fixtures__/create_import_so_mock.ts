/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readStreamToCompletion } from './read_stream_to_completion';

export const createImportSavedObjectsFromStreamMock = () => {
  return jest.fn().mockImplementation(async (opts: Record<string, any>) => {
    const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
    return {
      success: true,
      successCount: objectsToImport.length,
    };
  });
};
