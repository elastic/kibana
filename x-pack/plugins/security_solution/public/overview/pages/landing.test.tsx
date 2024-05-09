/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { LandingPage } from './landing';
import { Router } from '@kbn/shared-ux-router';
import { createBrowserHistory } from 'history';
import type { PropsWithChildren } from 'react';
import React from 'react';

jest.mock('../../common/components/landing_page');
jest.mock('../../common/components/page_wrapper', () => ({
  SecuritySolutionPageWrapper: jest
    .fn()
    .mockImplementation(({ children }: PropsWithChildren<unknown>) => <div>{children}</div>),
}));
const history = createBrowserHistory();
describe('LandingPage', () => {
  it('renders page properly', () => {
    const { queryByTestId } = render(
      <Router history={history}>
        <LandingPage />
      </Router>
    );
    expect(queryByTestId('siem-landing-page')).toBeInTheDocument();
  });
});
