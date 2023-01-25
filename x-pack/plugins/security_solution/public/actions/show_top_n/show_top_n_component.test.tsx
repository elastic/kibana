/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { TestProviders } from '../../common/mock';
import { TopNAction } from './show_top_n_component';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import type { CasesUiStart } from '@kbn/cases-plugin/public';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '/test' }),
  };
});
jest.mock('../../common/components/visualization_actions');

const casesService = {
  ui: { getCasesContext: () => mockCasesContext },
} as unknown as CasesUiStart;

const element = document.createElement('div');
document.body.appendChild(element);

const context = {
  field: { name: 'user.name', value: 'the-value', type: 'keyword' },
  trigger: { id: 'trigger' },
  nodeRef: {
    current: element,
  },
} as CellActionExecutionContext;

describe('TopNAction', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TopNAction onClose={() => {}} context={context} casesService={casesService} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('topN-container')).toBeInTheDocument();
  });

  it('does not render when nodeRef is null', () => {
    const { queryByTestId } = render(
      <TopNAction
        onClose={() => {}}
        context={{ ...context, nodeRef: { current: null } }}
        casesService={casesService}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(queryByTestId('topN-container')).not.toBeInTheDocument();
  });
});
