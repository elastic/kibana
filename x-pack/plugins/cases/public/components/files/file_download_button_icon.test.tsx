/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import {
  createAppMockRenderer,
  mockedFilesClient,
  mockedTestProvidersOwner,
} from '../../common/mock';
import { FileDownloadButtonIcon } from './file_download_button_icon';
import { basicFileMock } from '../../containers/mock';
import { constructFileKindIdByOwner } from '../../../common/constants';

describe('FileDownloadButtonIcon', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders download button with correct href', async () => {
    appMockRender.render(<FileDownloadButtonIcon fileId={basicFileMock.id} />);

    expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

    expect(mockedFilesClient.getDownloadHref).toBeCalledTimes(1);
    expect(mockedFilesClient.getDownloadHref).toHaveBeenCalledWith({
      fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      id: basicFileMock.id,
    });
  });
});
