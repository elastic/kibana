/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { coreMock } from '@kbn/core/server/mocks';

import { UnauthenticatedPage } from './unauthenticated_page';

jest.mock('@kbn/core/server/rendering/views/fonts', () => ({
  Fonts: () => <>MockedFonts</>,
}));

describe('UnauthenticatedPage', () => {
  it('renders as expected', async () => {
    const mockCoreSetup = coreMock.createSetup();
    (mockCoreSetup.http.basePath.prepend as jest.Mock).mockImplementation(
      (path) => `/mock-basepath${path}`
    );

    const body = renderToStaticMarkup(
      <UnauthenticatedPage
        originalURL="/some/url?some-query=some-value#some-hash"
        buildNumber={100500}
        basePath={mockCoreSetup.http.basePath}
      />
    );

    expect(body).toMatchSnapshot();
  });
});
