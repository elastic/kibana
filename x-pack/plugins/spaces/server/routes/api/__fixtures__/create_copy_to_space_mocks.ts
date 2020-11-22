/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';
import { createPromiseFromStreams, createConcatStream } from '@kbn/std';

async function readStreamToCompletion(stream: Readable) {
  return (await (createPromiseFromStreams([stream, createConcatStream([])]) as unknown)) as any[];
}

export const createExportSavedObjectsToStreamMock = () => {
  return jest.fn().mockResolvedValue(
    new Readable({
      objectMode: true,
      read() {
        this.push(null);
      },
    })
  );
};

export const createImportSavedObjectsFromStreamMock = () => {
  return jest.fn().mockImplementation(async (opts: Record<string, any>) => {
    const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
    return {
      success: true,
      successCount: objectsToImport.length,
    };
  });
};

export const createResolveSavedObjectsImportErrorsMock = () => {
  return jest.fn().mockImplementation(async (opts: Record<string, any>) => {
    const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
    return {
      success: true,
      successCount: objectsToImport.length,
    };
  });
};
