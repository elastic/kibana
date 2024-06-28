/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { basicCase, basicCaseClosed } from '../../containers/mock';
import type { CaseActionBarProps } from '.';
import { CaseActionBar } from '.';
import {
  allCasesPermissions,
  noDeleteCasesPermissions,
  noUpdateCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { useGetCaseConnectors } from '../../containers/use_get_case_connectors';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { CaseMetricsFeature } from '../../../common/types/api';

jest.mock('../../containers/use_get_case_connectors');
jest.mock('../case_view/use_on_refresh_case_view_page');

const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;

describe('CaseActionBar', () => {
  const caseConnectors = getCaseConnectorsMockResponse();

  const onUpdateField = jest.fn();
  const defaultProps: CaseActionBarProps = {
    caseData: basicCase,
    isLoading: false,
    onUpdateField,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseConnectorsMock.mockReturnValue({
      isLoading: false,
      data: caseConnectors,
    });
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-action-bar-status-date"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="sync-alerts-switch"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-refresh"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-view-actions"]`).exists()).toBeTruthy();
  });

  it('should show correct status', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toBe(
      'Open'
    );
  });

  it('should show the status as closed when the case is closed', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} caseData={basicCaseClosed} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toBe(
      'Closed'
    );
  });

  it('should show the correct date', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="case-action-bar-status-date"]`)
        .find('FormattedRelativePreferenceDate')
        .prop('value')
    ).toBe(basicCase.createdAt);
  });

  it('invalidates the queryClient cache onRefresh', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-refresh"]`).first().simulate('click');

    expect(useRefreshCaseViewPage()).toHaveBeenCalled();
  });

  it('should call onUpdateField when changing status', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    wrapper
      .find(`[data-test-subj="case-view-status-dropdown-in-progress"] button`)
      .simulate('click');

    expect(onUpdateField).toHaveBeenCalledWith({ key: 'status', value: 'in-progress' });
  });

  it('should call onUpdateField when changing syncAlerts setting', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="sync-alerts-switch"]').first().simulate('click');

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'settings',
      value: {
        syncAlerts: false,
      },
    });
  });

  it('should not show the sync alerts toggle when alerting is disabled', () => {
    const { queryByText } = render(
      <TestProviders features={{ alerts: { sync: false, enabled: true }, metrics: [] }}>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(queryByText('Sync alerts')).not.toBeInTheDocument();
  });

  it('should show the sync alerts toggle when alerting is enabled', () => {
    const { queryByText } = render(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(queryByText('Sync alerts')).toBeInTheDocument();
  });

  it('should not show the Case open text when the lifespan feature is enabled', () => {
    const props: CaseActionBarProps = { ...defaultProps };
    const { queryByText } = render(
      <TestProviders features={{ metrics: [CaseMetricsFeature.LIFESPAN] }}>
        <CaseActionBar {...props} />
      </TestProviders>
    );

    expect(queryByText('Case opened')).not.toBeInTheDocument();
  });

  it('should show the Case open text when the lifespan feature is disabled', () => {
    const { getByText } = render(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(getByText('Case opened')).toBeInTheDocument();
  });

  it('should show the change status text when the user has update privileges', () => {
    render(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTitle('Change status')).toBeInTheDocument();
  });

  it('should not show the change status text when the user does not have update privileges', () => {
    render(
      <TestProviders permissions={noUpdateCasesPermissions()}>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTitle('Change status')).not.toBeInTheDocument();
  });

  it('should not show the sync alerts toggle when the user does not have update privileges', () => {
    const { queryByText } = render(
      <TestProviders permissions={noUpdateCasesPermissions()}>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(queryByText('Sync alerts')).not.toBeInTheDocument();
  });

  it('should not show the delete item in the menu when the user does not have delete privileges', () => {
    const { queryByText, queryByTestId } = render(
      <TestProviders permissions={noDeleteCasesPermissions()}>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('property-actions-case-ellipses'));
    expect(queryByText('Delete case')).not.toBeInTheDocument();
    expect(queryByTestId('property-actions-case-trash')).not.toBeInTheDocument();
    expect(queryByTestId('property-actions-case-copyClipboard')).toBeInTheDocument();
  });

  it('should show the the delete item in the menu when the user does have delete privileges', () => {
    const { queryByText } = render(
      <TestProviders permissions={allCasesPermissions()}>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('property-actions-case-ellipses'));
    expect(queryByText('Delete case')).toBeInTheDocument();
  });

  it('shows the external incident action', async () => {
    const connector = caseConnectors['servicenow-1'];
    const { push, ...connectorWithoutPush } = connector;

    const props = {
      ...defaultProps,
      caseData: { ...defaultProps.caseData, connector: connectorWithoutPush },
    };

    render(
      <TestProviders>
        <CaseActionBar {...props} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('property-actions-case-ellipses'));

    await waitFor(() => {
      expect(screen.getByTestId('property-actions-case-popout')).toBeInTheDocument();
    });
  });

  it('does not show the external incident action', async () => {
    render(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('property-actions-case-ellipses'));

    expect(screen.queryByTestId('property-actions-case-popout')).not.toBeInTheDocument();
  });
});
