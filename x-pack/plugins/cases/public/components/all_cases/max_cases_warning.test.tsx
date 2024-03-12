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
    const pagination = {
      pageSize: size,
      pageIndex: MAX_DOCS_PER_PAGE / size + 1,
      totalItemCount: MAX_DOCS_PER_PAGE,
    };
    appMockRender.render(
      <MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE} pagination={pagination} />
    );

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
  });

  it.each(allCasesPageSize)(`shows warning when totalCases > ${MAX_DOCS_PER_PAGE}`, (size) => {
    const pagination = {
      pageSize: size,
      pageIndex: MAX_DOCS_PER_PAGE / size + 1,
      totalItemCount: MAX_DOCS_PER_PAGE + 1,
    };
    appMockRender.render(
      <MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE + 1} pagination={pagination} />
    );

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
  });

  it('should show dismiss button correctly', () => {
    const pagination = {
      pageSize: 10,
      pageIndex: MAX_DOCS_PER_PAGE / 10 + 1,
      totalItemCount: MAX_DOCS_PER_PAGE,
    };
    appMockRender.render(
      <MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE} pagination={pagination} />
    );

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-warning')).toBeInTheDocument();
  });

  it('should dismiss warning correctly', () => {
    const pagination = {
      pageSize: 10,
      pageIndex: MAX_DOCS_PER_PAGE / 10 + 1,
      totalItemCount: MAX_DOCS_PER_PAGE,
    };
    appMockRender.render(
      <MaxCasesWarning totalCases={MAX_DOCS_PER_PAGE} pagination={pagination} />
    );

    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-warning')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('dismiss-warning'));

    expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
  });
});
