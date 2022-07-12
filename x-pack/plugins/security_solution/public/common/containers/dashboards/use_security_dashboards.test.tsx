/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { EuiBasicTable } from '@elastic/eui';
import { useKibana } from '../../lib/kibana';
import { TestProviders } from '../../mock/test_providers';
import {
  DashboardTableItem,
  useDashboardsTableColumns,
  useSecurityDashboardsTableItems,
} from './use_security_dashboards';

jest.mock('../../lib/kibana');

const TAG_ID = 'securityTagId';
const basicResponse: DashboardTableItem[] = [
  {
    id: 'dashboardId1',
    type: 'dashboard',
    attributes: {
      title: 'title1',
      description: 'description1',
    },
    references: [{ type: 'tag', id: TAG_ID, name: 'tagName' }],
  },
  {
    id: 'dashboardId2',
    type: 'dashboard',
    attributes: {
      title: 'title2',
      description: 'description2',
    },
    references: [{ type: 'tag', id: TAG_ID, name: 'tagName' }],
  },
];

const renderUseSecurityDashboardsTableItems = async () => {
  const renderedHook = renderHook(() => useSecurityDashboardsTableItems(), {
    wrapper: TestProviders,
  });
  await act(async () => {
    // needed to let dashboard items to be updated from saved objects response
    await renderedHook.waitForNextUpdate();
  });
  return renderedHook;
};

const renderUseDashboardsTableColumns = () =>
  renderHook(() => useDashboardsTableColumns(), {
    wrapper: TestProviders,
  });

describe('Security Dashboards hooks', () => {
  const mockSavedObjectsFind = useKibana().services.savedObjects.client.find as jest.Mock;
  mockSavedObjectsFind.mockImplementation(async (req) => {
    if (req.type === 'tag') {
      return { savedObjects: [{ id: TAG_ID }] };
    } else if (req.type === 'dashboard') {
      return { savedObjects: basicResponse };
    }
    return { savedObjects: [] };
  });

  const mockGetRedirectUrl = jest.fn(() => '/path');
  useKibana().services.dashboard = {
    locator: { getRedirectUrl: mockGetRedirectUrl },
  } as unknown as DashboardStart;

  const mockTaggingGetTableColumnDefinition = useKibana().services.savedObjectsTagging?.ui
    .getTableColumnDefinition as jest.Mock;
  const tagsColumn = {
    field: 'id', // set existing field to prevent test error
    name: 'Tags',
    'data-test-subj': 'dashboard-tags-field',
  };
  mockTaggingGetTableColumnDefinition.mockReturnValue(tagsColumn);

  afterEach(() => {
    mockTaggingGetTableColumnDefinition.mockClear();
    mockGetRedirectUrl.mockClear();
    mockSavedObjectsFind.mockClear();
  });

  describe('useSecurityDashboardsTableItems', () => {
    afterEach(() => {
      mockSavedObjectsFind.mockClear();
    });

    it('should request when renders', async () => {
      await renderUseSecurityDashboardsTableItems();

      expect(mockSavedObjectsFind).toHaveBeenCalledTimes(2);
      expect(mockSavedObjectsFind).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tag', search: 'security' })
      );
      expect(mockSavedObjectsFind).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'dashboard', hasReference: { id: TAG_ID, type: 'tag' } })
      );
    });

    it('should not re-request when re-rendered', async () => {
      const { rerender } = await renderUseSecurityDashboardsTableItems();

      expect(mockSavedObjectsFind).toHaveBeenCalledTimes(2);
      act(() => rerender());
      expect(mockSavedObjectsFind).toHaveBeenCalledTimes(2);
    });

    it('returns a memoized value', async () => {
      const { result, rerender } = await renderUseSecurityDashboardsTableItems();

      const result1 = result.current;
      act(() => rerender());
      const result2 = result.current;

      expect(result1).toBe(result2);
    });

    it('should return dashboard items', async () => {
      const { result } = await renderUseSecurityDashboardsTableItems();

      const [dashboard1, dashboard2] = basicResponse;
      expect(result.current).toStrictEqual([
        {
          ...dashboard1,
          title: dashboard1.attributes.title,
          description: dashboard1.attributes.description,
        },
        {
          ...dashboard2,
          title: dashboard2.attributes.title,
          description: dashboard2.attributes.description,
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
      const { result, rerender } = await renderUseSecurityDashboardsTableItems();

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
      <EuiBasicTable items={itemsResult.current} columns={columnsResult.current} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(result.getAllByText('Title').length).toBeGreaterThan(0);
    expect(result.getAllByText('Description').length).toBeGreaterThan(0);
    expect(result.getAllByText('Tags').length).toBeGreaterThan(0);

    expect(result.getByText('title1')).toBeInTheDocument();
    expect(result.getByText('description1')).toBeInTheDocument();
    expect(result.getByText('title2')).toBeInTheDocument();
    expect(result.getByText('description2')).toBeInTheDocument();

    expect(result.queryAllByTestId('dashboard-title-field')).toHaveLength(2);
    expect(result.queryAllByTestId('dashboard-description-field')).toHaveLength(2);
    expect(result.queryAllByTestId('dashboard-tags-field')).toHaveLength(2);
  });
});
