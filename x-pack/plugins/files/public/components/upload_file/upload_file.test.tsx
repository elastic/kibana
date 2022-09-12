/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { registerTestBed } from '@kbn/test-jest-helpers';

import {
  FileKindsRegistryImpl,
  setFileKindsRegistry,
  getFileKindsRegistry,
} from '../../../common/file_kinds_registry';

import { createMockFilesClient } from '../../mocks';

import { FileJSON } from '../../../common';
import { FilesContext } from '../context';
import { UploadFile, Props } from './upload_file';
import { UploadFileUI } from './components';

describe('UploadFile', () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  let onDone: jest.Mock;
  let onError: jest.Mock;
  let client: ReturnType<typeof createMockFilesClient>;

  async function initTestBed(props?: Partial<Props>) {
    const createTestBed = registerTestBed((p: Props) => (
      <FilesContext>
        <UploadFile {...p} />
      </FilesContext>
    ));

    const testBed = await createTestBed({
      client,
      kind: 'test',
      onDone,
      onError,
      ...props,
    });

    const baseTestSubj = `filesUploadFile`;

    const testSubjects = {
      base: baseTestSubj,
      uploadButton: `${baseTestSubj}.uploadButton`,
      cancelButton: `${baseTestSubj}.cancelButton`,
    };

    return {
      ...testBed,
      actions: {
        addFiles: (files: File[]) =>
          act(async () => {
            testBed.component.find(UploadFileUI).props().onChange(files);
            await sleep(1);
            testBed.component.update();
          }),
        upload: () =>
          act(async () => {
            testBed.find(testSubjects.uploadButton).simulate('click');
            await sleep(1);
            testBed.component.update();
          }),
        abort: () =>
          act(() => {
            testBed.find(testSubjects.cancelButton).simulate('click');
            testBed.component.update();
          }),
        wait: (ms: number) =>
          act(async () => {
            await sleep(ms);
          }),
      },
      testSubjects,
    };
  }

  beforeAll(() => {
    setFileKindsRegistry(new FileKindsRegistryImpl());
    getFileKindsRegistry().register({
      id: 'test',
      http: {},
    });
  });

  beforeEach(() => {
    client = createMockFilesClient();
    onDone = jest.fn();
    onError = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('does not show the upload button for "immediate" uploads', async () => {
    client.create.mockResolvedValue({ file: { id: 'test' } as FileJSON });
    client.upload.mockImplementation(() => sleep(100).then(() => ({ ok: true, size: 1 })));

    const { actions, exists, testSubjects } = await initTestBed({ onDone, immediate: true });
    expect(exists(testSubjects.uploadButton)).toBe(false);
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    expect(exists(testSubjects.uploadButton)).toBe(false);
    await actions.wait(100);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('allows users to cancel uploads', async () => {
    client.create.mockResolvedValue({ file: { id: 'test' } as FileJSON });
    client.upload.mockImplementation(() => sleep(1000).then(() => ({ ok: true, size: 1 })));

    const { actions, testSubjects, find } = await initTestBed();
    await actions.addFiles([{ name: 'test', size: 1 } as File]);
    expect(find(testSubjects.cancelButton).props().disabled).toBe(true);
    await actions.upload();
    expect(find(testSubjects.cancelButton).props().disabled).toBe(false);
    actions.abort();

    await sleep(1000);

    expect(onDone).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(new Error('Abort!'));
  });
});
