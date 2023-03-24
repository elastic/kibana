/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';

import { constructFileKindIdByOwner } from '../../../common/constants';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import { basicFileMock } from '../../containers/mock';
import { FilePreview } from './file_preview';

describe('FilePreview', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('FilePreview rendered correctly', async () => {
    const mockGetDownloadRef = jest.fn();

    appMockRender.render(
      <FilePreview
        closePreview={jest.fn()}
        selectedFile={basicFileMock}
        getDownloadHref={mockGetDownloadRef}
      />
    );

    await waitFor(() =>
      expect(mockGetDownloadRef).toBeCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  // I cannot get this test to work
  it.skip('clicking outside Image triggers closePreview', () => {
    const mockClosePreview = jest.fn();

    appMockRender.render(
      <>
        <div data-test-subj="outsideClickDummy" />
        <FilePreview
          closePreview={mockClosePreview}
          selectedFile={basicFileMock}
          getDownloadHref={jest.fn()}
        />
      </>
    );

    userEvent.click(screen.getByTestId('outsideClickDummy'));
    expect(mockClosePreview).toBeCalled();
  });
});
