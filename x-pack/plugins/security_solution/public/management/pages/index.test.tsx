/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ManagementContainer } from './index';
import { AppContextTestRender, createAppRootMockRenderer } from '../../common/mock/endpoint';
import { useIngestEnabledCheck } from '../../common/hooks/endpoint/ingest_enabled';

jest.mock('../../common/hooks/endpoint/ingest_enabled');

describe('when in the Admistration tab', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    render = () => mockedContext.render(<ManagementContainer />);
  });

  it('should display the No Permissions view when Ingest is OFF', async () => {
    (useIngestEnabledCheck as jest.Mock).mockReturnValue({ allEnabled: false });
    const renderResult = render();
    const noIngestPermissions = await renderResult.findByTestId('noIngestPermissions');
    expect(noIngestPermissions).not.toBeNull();
  });

  it('should display the Management view when Ingest is ON', async () => {
    (useIngestEnabledCheck as jest.Mock).mockReturnValue({ allEnabled: true });
    const renderResult = render();
    const hostPage = await renderResult.findByTestId('hostPage');
    expect(hostPage).not.toBeNull();
  });
});
