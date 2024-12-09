/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import { FileDownloadButton } from './file_download_button';
import { basicFileMock } from '../../containers/mock';
import { constructFileKindIdByOwner } from '../../../common/files';

describe('FileDownloadButton', () => {
  let appMockRender: AppMockRenderer;

  describe('isIcon', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      appMockRender = createAppMockRenderer();
    });

    it('renders download button with correct href', async () => {
      appMockRender.render(<FileDownloadButton fileId={basicFileMock.id} isIcon={true} />);

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

      expect(appMockRender.getFilesClient().getDownloadHref).toBeCalledTimes(1);
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
        id: basicFileMock.id,
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/201611
  describe.skip('not isIcon', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      appMockRender = createAppMockRenderer();
    });

    it('renders download button with correct href', async () => {
      appMockRender.render(<FileDownloadButton fileId={basicFileMock.id} />);

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

      expect(appMockRender.getFilesClient().getDownloadHref).toBeCalledTimes(1);
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
        id: basicFileMock.id,
      });
    });
  });
});
