/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnvironmentMode } from 'src/core/server';
import { ResetSessionPage } from './reset_session_page';

jest.mock('../../../../../src/core/server/rendering/views/fonts', () => ({
  Fonts: () => <>MockedFonts</>,
}));

describe('ResetSessionPage', () => {
  it('renders as expected in prod mode', async () => {
    const environmentMode = { prod: true } as EnvironmentMode;

    const body = renderToStaticMarkup(
      <ResetSessionPage
        logoutUrl="/path/to/logout"
        styleSheetPaths={['/some-css-file.css', '/some-other-css-file.css']}
        basePath="/path/to/base"
        environmentMode={environmentMode}
      />
    );

    expect(body).toMatchSnapshot();
  });

  it('renders as expected in non-prod mode', async () => {
    const environmentMode = { prod: false } as EnvironmentMode;

    const body = renderToStaticMarkup(
      <ResetSessionPage
        logoutUrl="/path/to/logout"
        styleSheetPaths={['/some-css-file.css', '/some-other-css-file.css']}
        basePath="/path/to/base"
        environmentMode={environmentMode}
      />
    );

    expect(body).toMatchSnapshot();
  });
});
