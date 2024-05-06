/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { EuiBasicTable } from '@elastic/eui';
import { useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock/test_providers';
import {
  useSecurityDashboardsTableColumns,
  useSecurityDashboardsTableItems,
} from './use_security_dashboards_table';
import { METRIC_TYPE, TELEMETRY_EVENT } from '../../common/lib/telemetry/constants';
import * as telemetry from '../../common/lib/telemetry/track';
import { SecurityPageName } from '../../../common/constants';
import * as linkTo from '../../common/components/link_to';
import { getDashboardsByTagIds } from '../../common/containers/dashboards/api';
import { DEFAULT_DASHBOARDS_RESPONSE } from '../../common/containers/dashboards/__mocks__/api';
import { DashboardContextProvider } from '../context/dashboard_context';
import type { HttpStart } from '@kbn/core/public';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/tags/api');
jest.mock('../../common/containers/dashboards/api');
const spyUseGetSecuritySolutionUrl = jest.spyOn(linkTo, 'useGetSecuritySolutionUrl');
const spyTrack = jest.spyOn(telemetry, 'track');
const {
  id: mockReturnDashboardId,
  attributes: { title: mockReturnDashboardTitle, description: mockReturnDashboardDescription },
} = DEFAULT_DASHBOARDS_RESPONSE[0];
const renderUseSecurityDashboardsTableItems = async () => {
  const renderedHook = renderHook(() => useSecurityDashboardsTableItems(), {
    wrapper: DashboardContextProvider,
  });
  await act(async () => {
    // needed to let dashboard items to be updated from saved objects response
    await renderedHook.waitForNextUpdate();
  });
  return renderedHook;
};

const renderUseDashboardsTableColumns = () =>
  renderHook(() => useSecurityDashboardsTableColumns(), {
    wrapper: TestProviders,
  });

describe('Security Dashboards Table hooks', () => {
  const mockGetRedirectUrl = jest.fn(() => '/path');
  useKibana().services.dashboard = {
    locator: { getRedirectUrl: mockGetRedirectUrl },
  } as unknown as DashboardStart;
  useKibana().services.http = {} as unknown as HttpStart;

  const mockTaggingGetTableColumnDefinition = useKibana().services.savedObjectsTagging?.ui
    .getTableColumnDefinition as jest.Mock;
  const tagsColumn = {
    field: 'id', // set existing field to prevent test error
    name: 'Tags',
    'data-test-subj': 'dashboardTableTagsCell',
  };
  mockTaggingGetTableColumnDefinition.mockReturnValue(tagsColumn);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useSecurityDashboardsTableItems', () => {
    it('should request when renders', async () => {
      await renderUseSecurityDashboardsTableItems();
      expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
    });

    it('should not request again when rerendered', async () => {
      const { rerender } = await renderUseSecurityDashboardsTableItems();

      expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
      act(() => rerender());
      expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
    });

    it('should return a memoized value when rerendered', async () => {
      const { result, rerender } = await renderUseSecurityDashboardsTableItems();

      const result1 = result.current.items;
      act(() => rerender());
      const result2 = result.current.items;

      expect(result1).toBe(result2);
    });

    it('should return dashboard items', async () => {
      const { result } = await renderUseSecurityDashboardsTableItems();

      const [dashboard1] = DEFAULT_DASHBOARDS_RESPONSE;
      expect(result.current.items).toStrictEqual([
        {
          ...dashboard1,
          title: dashboard1.attributes.title,
          description: dashboard1.attributes.description,
        },
      ]);
    });
  });

  describe('useDashboardsTableColumns', () => {
    it('should call getTableColumnDefinition to get tags column', () => {
      renderUseDashboardsTableColumns();
      expect(mockTaggingGetTableColumnDefinition).toHaveBeenCalled();
    });

    it('should return dashboard columns', () => {
      const { result } = renderUseDashboardsTableColumns();

      expect(result.current).toEqual([
        expect.objectContaining({
          field: 'title',
          name: 'Title',
        }),
        expect.objectContaining({
          field: 'description',
          name: 'Description',
        }),
        expect.objectContaining(tagsColumn),
      ]);
    });

    it('returns a memoized value', async () => {
      const { result, rerender } = renderUseDashboardsTableColumns();

      const result1 = result.current;
      act(() => rerender());
      const result2 = result.current;

      expect(result1).toBe(result2);
    });
  });

  it('should render a table with consistent items and columns', async () => {
    const { result: itemsResult } = await renderUseSecurityDashboardsTableItems();
    const { result: columnsResult } = renderUseDashboardsTableColumns();

    const result = render(
      <EuiBasicTable items={itemsResult.current.items} columns={columnsResult.current} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(result.getAllByText('Title').length).toBeGreaterThan(0);
    expect(result.getAllByText('Description').length).toBeGreaterThan(0);
    expect(result.getAllByText('Tags').length).toBeGreaterThan(0);

    expect(result.getByText(mockReturnDashboardTitle)).toBeInTheDocument();
    expect(result.getByText(mockReturnDashboardDescription)).toBeInTheDocument();

    expect(result.queryAllByTestId('dashboardTableTitleCell')).toHaveLength(1);
    expect(result.queryAllByTestId('dashboardTableDescriptionCell')).toHaveLength(1);
    expect(result.queryAllByTestId('dashboardTableTagsCell')).toHaveLength(1);
  });

  it('should send telemetry when dashboard title clicked', async () => {
    const { result: itemsResult } = await renderUseSecurityDashboardsTableItems();
    const { result: columnsResult } = renderUseDashboardsTableColumns();

    const result = render(
      <EuiBasicTable items={itemsResult.current.items} columns={columnsResult.current} />,
      {
        wrapper: TestProviders,
      }
    );

    result.getByText(mockReturnDashboardTitle).click();
    expect(spyTrack).toHaveBeenCalledWith(METRIC_TYPE.CLICK, TELEMETRY_EVENT.DASHBOARD);
  });

  it('should land on SecuritySolution dashboard view page when dashboard title clicked', async () => {
    const mockGetSecuritySolutionUrl = jest.fn();
    spyUseGetSecuritySolutionUrl.mockImplementation(() => mockGetSecuritySolutionUrl);
    const { result: itemsResult } = await renderUseSecurityDashboardsTableItems();
    const { result: columnsResult } = renderUseDashboardsTableColumns();

    render(<EuiBasicTable items={itemsResult.current.items} columns={columnsResult.current} />, {
      wrapper: TestProviders,
    });

    expect(mockGetSecuritySolutionUrl).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.dashboards,
      path: mockReturnDashboardId,
    });
  });
});
