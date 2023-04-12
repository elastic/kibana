/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { DashboardView } from '.';
import { useCapabilities } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => <div data-test-subj="siem-search-bar" />,
}));

// jest.mock('../../../common/components/dashboards/dashboard_renderer', () => ({
//   DashboardRenderer: () => <div data-test-subj="dashboard-renderer" />,
// }));

jest.mock('../../../common/lib/kibana', () => ({
  useCapabilities: jest.fn().mockReturnValue({
    show: true,
    showWriteControls: true,
  }),
}));

jest.mock('../../../common/containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    indexPattern: 'auditbeat-*',
    indicesExist: true,
  }),
}));

jest.mock('../../../common/utils/route/spy_routes');

jest.mock('react-router-dom', () => ({
  useParams: jest.fn().mockReturnValue({
    detailName: 'mockSavedObjectId',
  }),
  withRouter: jest.fn(),
}));

describe('DashboardView', () => {
  it.only('should render EditDashboardButton', () => {
    // (useCapabilities as jest.Mock).mockReturnValue({
    //   show: true,
    //   showWriteControls: true,
    // });
    const { queryByTestId } = render(
      <TestProviders>
        <DashboardView />
      </TestProviders>
    );
    expect(queryByTestId('dashboardEditButton')).toBeInTheDocument();
  });

  it('should render Dashboard', () => {
    // (useCapabilities as jest.Mock).mockReturnValue({
    //   show: true,
    //   showWriteControls: true,
    // });
    const { queryByTestId } = render(
      <TestProviders>
        <DashboardView />
      </TestProviders>
    );
    expect(queryByTestId('dashboard-view-mockSavedObjectId')).toBeInTheDocument();
  });
});
