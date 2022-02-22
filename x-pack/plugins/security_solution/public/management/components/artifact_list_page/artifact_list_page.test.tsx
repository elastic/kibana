/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { EventFiltersListPage } from '../../pages/event_filters/view/event_filters_list_page';
import React from 'react';
import { trustedAppsAllHttpMocks } from '../../pages/mocks';

describe('When using the ArtifactListPage component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let mockedApi: ReturnType<trustedAppsAllHttpMocks>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    ({ history, coreStart } = mockedContext);
    render = () => (renderResult = mockedContext.render(<EventFiltersListPage />));
    mockedApi = trustedAppsAllHttpMocks(coreStart.http);
  });

  it('should display a loader while determining which view to show', () => {
    // FIXME:PT do it
  });

  describe('and with NO data exists', () => {
    // FIXME:PT empty state
  });

  describe('and data exists', () => {
    // FIXME:PT with data
  });
});
