/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import userEvent from '@testing-library/user-event';
import { FilesUtilityBar } from './files_utility_bar';

const defaultProps = {
  caseId: 'foobar',
  onSearch: jest.fn(),
};

// FLAKY: https://github.com/elastic/kibana/issues/174571
describe.skip('FilesUtilityBar', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<FilesUtilityBar {...defaultProps} />);

    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-search')).toBeInTheDocument();
  });

  it('search text passed correctly to callback', async () => {
    appMockRender.render(<FilesUtilityBar {...defaultProps} />);

    await userEvent.type(screen.getByTestId('cases-files-search'), 'My search{enter}');
    expect(defaultProps.onSearch).toBeCalledWith('My search');
  });
});
