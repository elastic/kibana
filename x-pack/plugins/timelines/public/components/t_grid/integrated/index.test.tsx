/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TGridIntegrated, TGridIntegratedProps } from '.';
import { TestProviders, tGridIntegratedProps } from '../../../mock';

const mockId = tGridIntegratedProps.id;
jest.mock('../../../container', () => ({
  useTimelineEvents: () => [
    false,
    {
      id: mockId,
      inspect: {
        dsl: [],
        response: [],
      },
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        querySize: 0,
      },
      events: [],
      updatedAt: 0,
    },
  ],
}));
jest.mock('../helpers', () => {
  const original = jest.requireActual('../helpers');
  return {
    ...original,
    getCombinedFilterQuery: () => ({
      bool: {
        must: [],
        filter: [],
      },
    }),
    buildCombinedQuery: () => ({
      filterQuery: '{"bool":{"must":[],"filter":[]}}',
    }),
  };
});
const defaultProps: TGridIntegratedProps = tGridIntegratedProps;
describe('integrated t_grid', () => {
  const dataTestSubj = 'right-here-dawg';
  it('does not render graphOverlay if graphOverlay=null', () => {
    render(
      <TestProviders>
        <TGridIntegrated {...defaultProps} />
      </TestProviders>
    );
    expect(screen.queryByTestId(dataTestSubj)).toBeNull();
  });
  it('does render graphOverlay if graphOverlay=React.ReactNode', () => {
    render(
      <TestProviders>
        <TGridIntegrated {...defaultProps} graphOverlay={<span data-test-subj={dataTestSubj} />} />
      </TestProviders>
    );
    expect(screen.queryByTestId(dataTestSubj)).not.toBeNull();
  });

  it(`prevents view selection from overlapping EuiDataGrid's 'Full screen' button`, () => {
    render(
      <TestProviders>
        <TGridIntegrated {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('updated-flex-group')).toHaveStyleRule(
      `margin-right`,
      euiDarkVars.paddingSizes.xl
    );
  });
});
