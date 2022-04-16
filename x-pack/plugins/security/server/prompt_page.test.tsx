/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { coreMock } from '@kbn/core/server/mocks';

import { PromptPage } from './prompt_page';

jest.mock('@kbn/core/server/rendering/views/fonts', () => ({
  Fonts: () => <>MockedFonts</>,
}));

describe('PromptPage', () => {
  it('renders as expected without additional scripts', async () => {
    const mockCoreSetup = coreMock.createSetup();
    (mockCoreSetup.http.basePath.prepend as jest.Mock).mockImplementation(
      (path) => `/mock-basepath${path}`
    );

    const body = renderToStaticMarkup(
      <PromptPage
        buildNumber={100500}
        basePath={mockCoreSetup.http.basePath}
        title="Some Title"
        body={<div>Some Body</div>}
        actions={[<span>Action#1</span>, <span>Action#2</span>]}
      />
    );

    expect(body).toMatchSnapshot();
  });

  it('renders as expected with additional scripts', async () => {
    const mockCoreSetup = coreMock.createSetup();
    (mockCoreSetup.http.basePath.prepend as jest.Mock).mockImplementation(
      (path) => `/mock-basepath${path}`
    );

    const body = renderToStaticMarkup(
      <PromptPage
        buildNumber={100500}
        basePath={mockCoreSetup.http.basePath}
        scriptPaths={['/some/script1.js', '/some/script2.js']}
        title="Some Title"
        body={<div>Some Body</div>}
        actions={[<span>Action#1</span>, <span>Action#2</span>]}
      />
    );

    expect(body).toMatchSnapshot();
  });
});
