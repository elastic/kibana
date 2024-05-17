/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { useTiDataSources } from '../../containers/overview_cti_links/use_ti_data_sources';
import { CtiEnabledModule } from './cti_enabled_module';
import { mockCtiLinksResponse, mockProps, mockTiDataSources } from './mock';

jest.mock('../../containers/overview_cti_links/use_ti_data_sources');
const useTiDataSourcesMock = useTiDataSources as jest.Mock;
useTiDataSourcesMock.mockReturnValue(mockTiDataSources);

jest.mock('../../containers/overview_cti_links');
const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

describe('CtiEnabledModule', () => {
  it('renders CtiWithEvents when there are events', () => {
    render(
      <TestProviders>
        <CtiEnabledModule {...mockProps} />
      </TestProviders>
    );

    expect(screen.getByText('Showing: 5 indicators')).toBeInTheDocument();
  });
});
