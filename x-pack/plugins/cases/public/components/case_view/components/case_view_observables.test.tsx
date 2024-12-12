/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { CaseUI } from '../../../../common';
import type { AppMockRenderer } from '../../../common/mock';

import { createAppMockRenderer } from '../../../common/mock';
import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import { CaseViewObservables } from './case_view_observables';

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

describe('Case View Page observables tab', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('should render the utility bar for the observables table', async () => {
    appMockRender.render(<CaseViewObservables isLoading={false} caseData={caseData} />);

    expect((await screen.findAllByTestId('cases-observables-add')).length).toBe(2);
  });

  it('should render the observable table', async () => {
    appMockRender.render(<CaseViewObservables isLoading={false} caseData={caseData} />);

    expect(await screen.findByTestId('cases-observables-table')).toBeInTheDocument();
  });
});
