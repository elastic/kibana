/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';

import { createAppMockRenderer } from '../../common/mock';
import { basicFileMock } from '../../containers/mock';
import { FileNameLink } from './file_name_link';

// Failing: See https://github.com/elastic/kibana/issues/192944
describe.skip('FileNameLink', () => {
  let appMockRender: AppMockRenderer;

  const defaultProps = {
    file: basicFileMock,
    showPreview: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders clickable name if file is image', async () => {
    appMockRender.render(<FileNameLink {...defaultProps} />);

    const nameLink = await screen.findByTestId('cases-files-name-link');

    expect(nameLink).toBeInTheDocument();

    await userEvent.click(nameLink);

    expect(defaultProps.showPreview).toHaveBeenCalled();
  });

  it('renders simple text name if file is not image', async () => {
    appMockRender.render(
      <FileNameLink
        showPreview={defaultProps.showPreview}
        file={{ ...basicFileMock, mimeType: 'text/csv' }}
      />
    );

    const nameLink = await screen.findByTestId('cases-files-name-text');

    expect(nameLink).toBeInTheDocument();

    await userEvent.click(nameLink);

    expect(defaultProps.showPreview).not.toHaveBeenCalled();
  });
});
