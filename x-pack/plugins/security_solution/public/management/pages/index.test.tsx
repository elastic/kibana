/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ManagementContainer } from './index';
import '../../common/mock/match_media.ts';
import { AppContextTestRender, createAppRootMockRenderer } from '../../common/mock/endpoint';
import { useIngestEnabledCheck } from '../../common/hooks/endpoint/ingest_enabled';

jest.mock('../../common/hooks/endpoint/ingest_enabled');

describe('when in the Admistration tab', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let coreStart: AppContextTestRender['coreStart'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    coreStart = mockedContext.coreStart;
    render = () => mockedContext.render(<ManagementContainer />);
    coreStart.http.get.mockImplementation(() =>
      Promise.resolve({
        response: [
          {
            name: 'endpoint',
          },
        ],
      })
    );
  });

  it('should display the No Permissions view when Ingest is OFF', async () => {
    (useIngestEnabledCheck as jest.Mock).mockReturnValue({ allEnabled: false });

    expect(await render().findByTestId('noIngestPermissions')).not.toBeNull();
  });

  it('should display the Management view when Ingest is ON', async () => {
    (useIngestEnabledCheck as jest.Mock).mockReturnValue({ allEnabled: true });

    expect(await render().findByTestId('endpointPage')).not.toBeNull();
  });
});
