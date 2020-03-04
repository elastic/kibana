/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

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
