/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import '../../common/mock/match_media';
import { useUrlParams } from '../../common/navigation/hooks';
import { CaseViewPage } from './case_view_page';
import { caseData, caseViewProps } from './mocks';
import type { CaseViewPageProps } from './types';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';

jest.mock('../../common/navigation/hooks');
jest.mock('../use_breadcrumbs');
jest.mock('./use_on_refresh_case_view_page');
jest.mock('../../common/hooks');
jest.mock('../../common/lib/kibana');

jest.mock('../header_page', () => ({
  HeaderPage: jest
    .fn()
    .mockReturnValue(<div data-test-subj="test-case-view-header">{'Case view header'}</div>),
}));

jest.mock('./metrics', () => ({
  CaseViewMetrics: jest
    .fn()
    .mockReturnValue(<div data-test-subj="test-case-view-metrics">{'Case view metrics'}</div>),
}));

jest.mock('./components/case_view_activity', () => ({
  CaseViewActivity: jest
    .fn()
    .mockReturnValue(<div data-test-subj="test-case-view-activity">{'Case view activity'}</div>),
}));

jest.mock('./components/case_view_alerts', () => ({
  CaseViewAlerts: jest
    .fn()
    .mockReturnValue(<div data-test-subj="test-case-view-alerts">{'Case view alerts'}</div>),
}));

jest.mock('./components/case_view_files', () => ({
  CaseViewFiles: jest
    .fn()
    .mockReturnValue(<div data-test-subj="test-case-view-files">{'Case view files'}</div>),
}));

const useUrlParamsMock = useUrlParams as jest.Mock;
const useCasesTitleBreadcrumbsMock = useCasesTitleBreadcrumbs as jest.Mock;

const caseProps: CaseViewPageProps = {
  ...caseViewProps,
  caseData,
  fetchCase: jest.fn(),
};

describe('CaseViewPage', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    useUrlParamsMock.mockReturnValue({});
    appMockRenderer = createAppMockRenderer();
  });

  it('shows the header section', async () => {
    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('test-case-view-header')).toBeInTheDocument();
  });

  it('shows the metrics section', async () => {
    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('test-case-view-metrics')).toBeInTheDocument();
  });

  it('shows the activity section', async () => {
    appMockRenderer.render(<CaseViewPage {...caseProps} />);

    expect(await screen.findByTestId('test-case-view-activity')).toBeInTheDocument();
  });

  it('should set the breadcrumbs correctly', async () => {
    const onComponentInitialized = jest.fn();

    appMockRenderer.render(
      <CaseViewPage {...caseProps} onComponentInitialized={onComponentInitialized} />
    );

    await waitFor(() => {
      expect(useCasesTitleBreadcrumbsMock).toHaveBeenCalledWith(caseProps.caseData.title);
    });
  });
});
