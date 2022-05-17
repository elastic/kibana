/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { InternalFileService } from './file_service';

describe('FileService', () => {
  let fileService: InternalFileService;
  const fileKind: string = 'test';

  it('creates file metadata', async () => {
    const file = await fileService.createFile({ fileKind, name: 'test' });
    expect(file.getMetadata()).toEqual(expect.objectContaining({}));
  });

  it('uploads file content', async () => {
    const file = await fileService.createFile({ fileKind, name: 'test' });
    await file.uploadContent(Readable.from(['upload this']));
  });

  it('retrieves a file', async () => {
    const file = await fileService.createFile({ fileKind, name: 'test' });
    const file2 = await fileService.find({ id: file.id, fileKind });
  });

  it('lists files', async () => {
    const file = await fileService.createFile({ fileKind, name: 'test' });
  });

  it('deletes files', async () => {
    const file = await fileService.createFile({ fileKind, name: 'test' });
    await file.delete();
  });
});
