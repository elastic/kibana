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

import { constructFileKindIdByOwner } from '../../../common/files';
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
    appMockRender.render(<FilePreview closePreview={jest.fn()} selectedFile={basicFileMock} />);

    await waitFor(() =>
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('pressing escape calls closePreview', async () => {
    const closePreview = jest.fn();

    appMockRender.render(<FilePreview closePreview={closePreview} selectedFile={basicFileMock} />);

    await waitFor(() =>
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();

    userEvent.keyboard('{esc}');

    await waitFor(() => expect(closePreview).toHaveBeenCalled());
  });
});
