/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import type { FileKind, FileJSON } from '../../../common';
import type { FilesClient } from '../../types';

import { UploadState } from './upload_state';

// TODO: Remove this once we have access to the shared file client mock
const getMockClient = (): DeeplyMockedKeys<FilesClient> => ({
  create: jest.fn(),
  delete: jest.fn(),
  download: jest.fn(),
  find: jest.fn(),
  getById: jest.fn(),
  getDownloadHref: jest.fn(),
  getMetrics: jest.fn(),
  getShare: jest.fn(),
  list: jest.fn(),
  listShares: jest.fn(),
  publicDownload: jest.fn(),
  share: jest.fn(),
  unshare: jest.fn(),
  update: jest.fn(),
  upload: jest.fn(),
});

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

describe('UploadState', () => {
  let filesClient: DeeplyMockedKeys<FilesClient>;
  let uploadState: UploadState;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    filesClient = getMockClient();
    uploadState = new UploadState({ id: 'test' } as FileKind, filesClient);
    testScheduler = getTestScheduler();
  });

  it('uploads all provided files', async () => {
    testScheduler.run(({ expectObservable, cold }) => {
      filesClient.create.mockReturnValue(of({ file: { id: 'test' } as FileJSON }) as any);
      filesClient.upload.mockReturnValue(of(undefined) as any);

      const file1 = { name: 'test' } as File;
      const file2 = { name: 'test 2' } as File;

      uploadState.setFiles([file1, file2]);

      const [file1$, file2$] = uploadState.files$.getValue();

      // Simulate upload being triggered async
      const upload$ = cold('--a|').pipe(tap(uploadState.upload));

      expectObservable(upload$).toBe('--a|');

      expectObservable(uploadState.uploading$).toBe('a-(bc)', {
        a: false,
        b: true,
        c: false,
      });

      expectObservable(file1$).toBe('a-(bc)', {
        a: { file: file1, status: 'idle' },
        b: { file: file1, status: 'uploading' },
        c: { file: file1, status: 'uploaded' },
      });

      expectObservable(file2$).toBe('a-(bc)', {
        a: { file: file2, status: 'idle' },
        b: { file: file2, status: 'uploading' },
        c: { file: file2, status: 'uploaded' },
      });
    });
  });
});
