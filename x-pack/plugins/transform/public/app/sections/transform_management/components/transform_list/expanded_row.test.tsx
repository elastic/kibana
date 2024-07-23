/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderReactTestingLibraryWithI18n } from '@kbn/test-jest-helpers';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import moment from 'moment-timezone';
import type { TransformListRow } from '../../../../common';
import { ExpandedRow } from './expanded_row';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

import { MlSharedContext } from '../../../../__mocks__/shared_context';
import { getMlSharedImports } from '../../../../../shared_imports';

const queryClient = new QueryClient();

describe('Transform: Transform List <ExpandedRow />', () => {
  const onAlertEdit = jest.fn();
  // Set timezone to US/Eastern for consistent test results.
  beforeEach(() => {
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Minimal initialization', async () => {
    const mlShared = await getMlSharedImports();
    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;

    renderReactTestingLibraryWithI18n(
      <QueryClientProvider client={queryClient}>
        <MlSharedContext.Provider value={mlShared}>
          <ExpandedRow item={item} onAlertEdit={onAlertEdit} />
        </MlSharedContext.Provider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Stats')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();

      const tabContent = screen.getByTestId('transformDetailsTabContent');
      expect(tabContent).toBeInTheDocument();

      expect(screen.getByTestId('transformDetailsTab')).toHaveAttribute('aria-selected', 'true');
      expect(within(tabContent).getByText('General')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('transformStatsTab'));

    await waitFor(() => {
      expect(screen.getByTestId('transformStatsTab')).toHaveAttribute('aria-selected', 'true');
      const tabContent = screen.getByTestId('transformStatsTabContent');
      expect(within(tabContent).getByText('Stats')).toBeInTheDocument();
    });
  });
});
