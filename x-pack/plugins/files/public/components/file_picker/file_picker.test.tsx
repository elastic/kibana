/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { registerTestBed } from '@kbn/test-jest-helpers';

import { createMockFilesClient } from '../../mocks';
import { FilesContext } from '../context';
import { FilePicker, Props } from './file_picker';
import {
  FileKindsRegistryImpl,
  getFileKindsRegistry,
  setFileKindsRegistry,
} from '../../../common/file_kinds_registry';
import { FileJSON } from '../../../common';

describe('FilePicker', () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  let client: ReturnType<typeof createMockFilesClient>;
  let onDone: jest.Mock;
  let onClose: jest.Mock;

  async function initTestBed(props?: Partial<Props>) {
    const createTestBed = registerTestBed((p: Props) => (
      <FilesContext client={client}>
        <FilePicker {...p} />
      </FilesContext>
    ));

    const testBed = await createTestBed({
      client,
      kind: 'test',
      onClose,
      onDone,
      ...props,
    } as Props);

    const baseTestSubj = `filePickerModal`;

    const testSubjects = {
      base: baseTestSubj,
      searchField: `${baseTestSubj}.searchField`,
      emptyPrompt: `${baseTestSubj}.emptyPrompt`,
      errorPrompt: `${baseTestSubj}.errorPrompt`,
      selectButton: `${baseTestSubj}.selectButton`,
      loadingSpinner: `${baseTestSubj}.loadingSpinner`,
      fileGrid: `${baseTestSubj}.fileGrid`,
    };

    return {
      ...testBed,
      actions: {
        select: (n: number) =>
          act(() => {
            const file = testBed.find(testSubjects.fileGrid).childAt(n).find(EuiButtonEmpty);
            file.simulate('click');
            testBed.component.update();
          }),
        done: () =>
          act(() => {
            testBed.find(testSubjects.selectButton).simulate('click');
          }),
        waitUntilLoaded: async () => {
          let tries = 5;
          while (tries) {
            await act(async () => {
              await sleep(100);
              testBed.component.update();
            });
            if (!testBed.exists(testSubjects.loadingSpinner)) {
              break;
            }
            --tries;
          }
        },
      },
      testSubjects,
    };
  }

  beforeAll(() => {
    setFileKindsRegistry(new FileKindsRegistryImpl());
    getFileKindsRegistry().register({
      id: 'test',
      maxSizeBytes: 10000,
      http: {},
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    client = createMockFilesClient();
    onDone = jest.fn();
    onClose = jest.fn();
  });

  it('intially shows a loadings spinner, then content', async () => {
    client.list.mockImplementation(() => Promise.resolve({ files: [], total: 0 }));
    const { exists, testSubjects, actions } = await initTestBed();
    expect(exists(testSubjects.loadingSpinner)).toBe(true);
    await actions.waitUntilLoaded();
    expect(exists(testSubjects.loadingSpinner)).toBe(false);
  });
  it('shows empty prompt when there are no files', async () => {
    client.list.mockImplementation(() => Promise.resolve({ files: [], total: 0 }));
    const { exists, testSubjects, actions } = await initTestBed();
    await actions.waitUntilLoaded();
    expect(exists(testSubjects.emptyPrompt)).toBe(true);
  });
  it('returns the IDs of the selected files', async () => {
    client.list.mockImplementation(() =>
      Promise.resolve({ files: [{ id: 'a' }, { id: 'b' }] as FileJSON[], total: 2 })
    );
    const { find, testSubjects, actions } = await initTestBed();
    await actions.waitUntilLoaded();
    expect(find(testSubjects.selectButton).props().disabled).toBe(true);
    actions.select(0);
    actions.select(1);
    expect(find(testSubjects.selectButton).props().disabled).toBe(false);
    actions.done();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenNthCalledWith(1, ['a', 'b']);
  });
});
