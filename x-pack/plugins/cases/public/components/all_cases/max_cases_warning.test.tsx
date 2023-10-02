/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { AppMockRenderer } from '../../common/mock';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { createAppMockRenderer } from '../../common/mock';
import { MaxCasesWarning } from './max_cases_warning';

describe('MaxCasesWarning', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });
  const allCasesPageSize = [10, 25, 50, 100];

  it.each(allCasesPageSize)(`shows warning when totalCases = ${MAX_DOCS_PER_PAGE}`, (size) => {
    appMockRender.render(<MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE} />);

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
  });

  it.each(allCasesPageSize)(`shows warning when totalCases > ${MAX_DOCS_PER_PAGE}`, (size) => {
    appMockRender.render(<MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE + 1} />);

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
  });

  it('should show dismiss button correctly', () => {
    appMockRender.render(<MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE} />);

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-warning')).toBeInTheDocument();
  });

  it('should dismiss warning correctly', () => {
    appMockRender.render(<MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE} />);

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-warning')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('dismiss-warning'));

    expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
  });
});
