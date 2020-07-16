/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FormEvent } from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { TestProviders } from '../../../common/mock';
import { ValueListsForm } from './form';
import { useImportList } from '../../../shared_imports';

jest.mock('../../../shared_imports');
const mockUseImportList = useImportList as jest.Mock;

const mockFile = ({
  name: 'foo.csv',
  path: '/home/foo.csv',
} as unknown) as File;

const mockSelectFile: <P>(container: ReactWrapper<P>, file: File) => Promise<void> = async (
  container,
  file
) => {
  const fileChange = container.find('EuiFilePicker').prop('onChange');
  act(() => {
    if (fileChange) {
      fileChange(([file] as unknown) as FormEvent);
    }
  });
};

describe('ValueListsForm', () => {
  let mockImportList: jest.Mock;

  beforeEach(() => {
    mockImportList = jest.fn();
    mockUseImportList.mockImplementation(() => ({
      start: mockImportList,
    }));
  });

  it('disables upload button when file is absent', () => {
    const container = mount(
      <TestProviders>
        <ValueListsForm onError={jest.fn()} onSuccess={jest.fn()} />
      </TestProviders>
    );

    expect(
      container.find('button[data-test-subj="value-lists-form-import-action"]').prop('disabled')
    ).toEqual(true);
  });

  it('calls importList when upload is clicked', async () => {
    const container = mount(
      <TestProviders>
        <ValueListsForm onError={jest.fn()} onSuccess={jest.fn()} />
      </TestProviders>
    );

    await mockSelectFile(container, mockFile);

    container.find('button[data-test-subj="value-lists-form-import-action"]').simulate('click');

    expect(mockImportList).toHaveBeenCalledWith(expect.objectContaining({ file: mockFile }));
  });

  it('calls onError if import fails', async () => {
    mockUseImportList.mockImplementation(() => ({
      start: jest.fn(),
      error: 'whoops',
    }));

    const onError = jest.fn();
    mount(
      <TestProviders>
        <ValueListsForm onError={onError} onSuccess={jest.fn()} />
      </TestProviders>
    );

    expect(onError).toHaveBeenCalledWith('whoops');
  });

  it('calls onSuccess if import succeeds', async () => {
    mockUseImportList.mockImplementation(() => ({
      start: jest.fn(),
      result: { mockResult: true },
    }));

    const onSuccess = jest.fn();
    mount(
      <TestProviders>
        <ValueListsForm onSuccess={onSuccess} onError={jest.fn()} />
      </TestProviders>
    );

    expect(onSuccess).toHaveBeenCalledWith({ mockResult: true });
  });
});
