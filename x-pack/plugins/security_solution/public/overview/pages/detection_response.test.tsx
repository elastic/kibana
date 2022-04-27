/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { DetectionResponse } from './detection_response';
import { TestProviders } from '../../common/mock';

jest.mock('../components/detection_response/rule_alerts_table', () => ({
  RuleAlertsTable: () => <div data-test-subj="mock_RuleAlertsTable" />,
}));

jest.mock('../components/detection_response/alerts_by_status', () => ({
  AlertsByStatus: () => <div data-test-subj="mock_AlertsByStatus" />,
}));

jest.mock('../components/detection_response/cases_by_status', () => ({
  CasesByStatus: () => <div data-test-subj="mock_CasesByStatus" />,
}));

jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => <div data-test-subj="mock_globalDatePicker" />,
}));

const defaultUseSourcererReturn = {
  indicesExist: true,
  loading: false,
  indexPattern: '',
};
const mockUseSourcererDataView = jest.fn(() => defaultUseSourcererReturn);
jest.mock('../../common/containers/sourcerer', () => ({
  useSourcererDataView: () => mockUseSourcererDataView(),
}));

const defaultUseUserInfoReturn = {
  signalIndexName: '',
  canUserREAD: true,
  hasIndexRead: true,
};
const mockUseUserInfo = jest.fn(() => defaultUseUserInfoReturn);
jest.mock('../../detections/components/user_info', () => ({
  useUserInfo: () => mockUseUserInfo(),
}));

const defaultUseCasesPermissionsReturn = { read: true };
const mockUseCasesPermissions = jest.fn(() => defaultUseCasesPermissionsReturn);
jest.mock('../../common/lib/kibana/hooks', () => {
  const original = jest.requireActual('../../common/lib/kibana/hooks');
  return {
    ...original,
    useGetUserCasesPermissions: () => mockUseCasesPermissions(),
  };
});

describe('DetectionResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSourcererDataView.mockReturnValue(defaultUseSourcererReturn);
    mockUseUserInfo.mockReturnValue(defaultUseUserInfoReturn);
    mockUseCasesPermissions.mockReturnValue(defaultUseCasesPermissionsReturn);
  });

  it('should render default page', () => {
    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_globalDatePicker')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseSections')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseLoader')).not.toBeInTheDocument();
    expect(result.getByText('Detection & Response')).toBeInTheDocument();
  });

  it('should render landing page if index not exist', () => {
    mockUseSourcererDataView.mockReturnValue({
      ...defaultUseSourcererReturn,
      indicesExist: false,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.getByTestId('siem-landing-page')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponsePage')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_globalDatePicker')).not.toBeInTheDocument();
  });

  it('should render loader if sourcerer is loading', () => {
    mockUseSourcererDataView.mockReturnValue({
      ...defaultUseSourcererReturn,
      loading: true,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_globalDatePicker')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseLoader')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseSections')).not.toBeInTheDocument();
  });

  it('should not render alerts data sections if user has not index read permission', () => {
    mockUseUserInfo.mockReturnValue({
      ...defaultUseUserInfoReturn,
      hasIndexRead: false,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    // TODO: assert other alert sections are not in the document
    expect(result.queryByTestId('mock_RuleAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_AlertsByStatus')).not.toBeInTheDocument();

    // TODO: assert cases sections are in the document
    expect(result.queryByTestId('mock_CasesByStatus')).toBeInTheDocument();
  });

  it('should not render alerts data sections if user has not kibana read permission', () => {
    mockUseUserInfo.mockReturnValue({
      ...defaultUseUserInfoReturn,
      canUserREAD: false,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();

    // TODO: assert all alert sections are not in the document
    expect(result.queryByTestId('mock_RuleAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_AlertsByStatus')).not.toBeInTheDocument();

    // TODO: assert all cases sections are in the document
    expect(result.queryByTestId('mock_CasesByStatus')).toBeInTheDocument();
  });

  it('should not render cases data sections if user has not cases read permission', () => {
    mockUseCasesPermissions.mockReturnValue({ read: false });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    // TODO: assert all alert sections are in the document
    expect(result.queryByTestId('mock_RuleAlertsTable')).toBeInTheDocument();
    expect(result.queryByTestId('mock_AlertsByStatus')).toBeInTheDocument();
    // TODO: assert all cases sections are not in the document
    expect(result.queryByTestId('mock_CasesByStatus')).not.toBeInTheDocument();
  });

  it('should render page permissions message if user has any read permission', () => {
    mockUseCasesPermissions.mockReturnValue({ read: false });
    mockUseUserInfo.mockReturnValue({
      ...defaultUseUserInfoReturn,
      hasIndexRead: false,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).not.toBeInTheDocument();
    expect(result.queryByTestId('noPermissionPage')).toBeInTheDocument();
  });
});
