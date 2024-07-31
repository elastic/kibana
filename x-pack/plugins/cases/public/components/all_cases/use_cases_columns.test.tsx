/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import type { GetCasesColumn } from './use_cases_columns';
import { ExternalServiceColumn, useCasesColumns } from './use_cases_columns';
import { useGetCasesMockState } from '../../containers/mock';
import { connectors, useCaseConfigureResponse } from '../configure_cases/__mock__';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, readCasesPermissions, TestProviders } from '../../common/mock';
import { renderHook } from '@testing-library/react-hooks';
import { CaseStatuses, CustomFieldTypes } from '../../../common/types/domain';
import { userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

jest.mock('../../containers/configure/use_get_case_configuration');

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;

const DEFAULT_SELECTED_COLUMNS = [
  { field: 'title', name: 'title', isChecked: true },
  { field: 'assignees', name: 'assignees', isChecked: true },
  { field: 'tags', name: 'tags', isChecked: true },
  { field: 'totalAlerts', name: 'totalAlerts', isChecked: true },
  { field: 'totalComment', name: 'totalComment', isChecked: true },
  { field: 'category', name: 'category', isChecked: true },
  { field: 'createdAt', name: 'createdAt', isChecked: true },
  { field: 'updatedAt', name: 'updatedAt', isChecked: true },
  { field: 'closedAt', name: 'closedAt', isChecked: false },
  { field: 'externalIncident', name: 'externalIncident', isChecked: true },
  { field: 'status', name: 'status', isChecked: true },
  { field: 'severity', name: 'severity', isChecked: true },
];

describe('useCasesColumns ', () => {
  let appMockRender: AppMockRenderer;
  const useCasesColumnsProps: GetCasesColumn = {
    filterStatus: [CaseStatuses.open],
    userProfiles: userProfilesMap,
    isSelectorView: false,
    selectedColumns: DEFAULT_SELECTED_COLUMNS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('return all selected columns correctly', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    const { result } = renderHook(
      () =>
        useCasesColumns({
          ...useCasesColumnsProps,
          selectedColumns: DEFAULT_SELECTED_COLUMNS.map((element) => ({
            ...element,
            isChecked: true,
          })),
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "20%",
          },
          Object {
            "field": "assignees",
            "name": "Assignees",
            "render": [Function],
          },
          Object {
            "field": "tags",
            "name": "Tags",
            "render": [Function],
            "width": "12%",
          },
          Object {
            "align": "right",
            "field": "totalAlerts",
            "name": "Alerts",
            "render": [Function],
            "width": "80px",
          },
          Object {
            "align": "right",
            "field": "totalComment",
            "name": "Comments",
            "render": [Function],
            "width": "90px",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "updatedAt",
            "name": "Updated on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "closedAt",
            "name": "Closed on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "name": "External incident",
            "render": [Function],
          },
          Object {
            "field": "status",
            "name": "Status",
            "render": [Function],
            "sortable": true,
            "width": "110px",
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
          Object {
            "align": "right",
            "name": "Actions",
            "render": [Function],
            "width": "100px",
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  it('only returns selected columns', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    const { result } = renderHook(() => useCasesColumns(useCasesColumnsProps), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "20%",
          },
          Object {
            "field": "assignees",
            "name": "Assignees",
            "render": [Function],
          },
          Object {
            "field": "tags",
            "name": "Tags",
            "render": [Function],
            "width": "12%",
          },
          Object {
            "align": "right",
            "field": "totalAlerts",
            "name": "Alerts",
            "render": [Function],
            "width": "80px",
          },
          Object {
            "align": "right",
            "field": "totalComment",
            "name": "Comments",
            "render": [Function],
            "width": "90px",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "updatedAt",
            "name": "Updated on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "name": "External incident",
            "render": [Function],
          },
          Object {
            "field": "status",
            "name": "Status",
            "render": [Function],
            "sortable": true,
            "width": "110px",
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
          Object {
            "align": "right",
            "name": "Actions",
            "render": [Function],
            "width": "100px",
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  it('returns the assignees column without the width specified when in the modal view', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    const { result } = renderHook(
      () => useCasesColumns({ ...useCasesColumnsProps, isSelectorView: true }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "55%",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
          Object {
            "align": "right",
            "render": [Function],
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  it('shows the select button if isSelectorView=true', async () => {
    const { result } = renderHook(
      () => useCasesColumns({ ...useCasesColumnsProps, isSelectorView: true }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "55%",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
          Object {
            "align": "right",
            "render": [Function],
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  it('shows the correct columns if isSelectorView=true', async () => {
    const { result } = renderHook(
      () => useCasesColumns({ ...useCasesColumnsProps, isSelectorView: true }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "55%",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
          Object {
            "align": "right",
            "render": [Function],
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  it('does not shows the actions if the user does not have the right permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });

    const { result } = renderHook(() => useCasesColumns(useCasesColumnsProps), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "20%",
          },
          Object {
            "field": "tags",
            "name": "Tags",
            "render": [Function],
            "width": "12%",
          },
          Object {
            "align": "right",
            "field": "totalAlerts",
            "name": "Alerts",
            "render": [Function],
            "width": "80px",
          },
          Object {
            "align": "right",
            "field": "totalComment",
            "name": "Comments",
            "render": [Function],
            "width": "90px",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "updatedAt",
            "name": "Updated on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "name": "External incident",
            "render": [Function],
          },
          Object {
            "field": "status",
            "name": "Status",
            "render": [Function],
            "sortable": true,
            "width": "110px",
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  it('returns custom field columns', async () => {
    const textKey = 'text_key';
    const toggleKey = 'toggle_key';

    const textLabel = 'Text Label';
    const toggleLabel = 'Toggle Label';

    appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });
    useGetCaseConfigurationMock.mockImplementation(() => ({
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [
          { key: textKey, label: textLabel, type: CustomFieldTypes.TEXT },
          { key: toggleKey, label: toggleLabel, type: CustomFieldTypes.TOGGLE },
        ],
      },
      isFetching: false,
    }));

    const { result } = renderHook(
      () =>
        useCasesColumns({
          ...useCasesColumnsProps,
          selectedColumns: [
            ...DEFAULT_SELECTED_COLUMNS,
            { field: textKey, name: textLabel, isChecked: true },
            { field: toggleKey, name: toggleLabel, isChecked: true },
          ],
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "field": "title",
            "name": "Name",
            "render": [Function],
            "sortable": true,
            "width": "20%",
          },
          Object {
            "field": "tags",
            "name": "Tags",
            "render": [Function],
            "width": "12%",
          },
          Object {
            "align": "right",
            "field": "totalAlerts",
            "name": "Alerts",
            "render": [Function],
            "width": "80px",
          },
          Object {
            "align": "right",
            "field": "totalComment",
            "name": "Comments",
            "render": [Function],
            "width": "90px",
          },
          Object {
            "field": "category",
            "name": "Category",
            "render": [Function],
            "sortable": true,
            "width": "120px",
          },
          Object {
            "field": "createdAt",
            "name": "Created on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "field": "updatedAt",
            "name": "Updated on",
            "render": [Function],
            "sortable": true,
          },
          Object {
            "name": "External incident",
            "render": [Function],
          },
          Object {
            "field": "status",
            "name": "Status",
            "render": [Function],
            "sortable": true,
            "width": "110px",
          },
          Object {
            "field": "severity",
            "name": "Severity",
            "render": [Function],
            "sortable": true,
            "width": "90px",
          },
          Object {
            "data-test-subj": "text-custom-field-column",
            "name": "Text Label",
            "render": [Function],
            "width": "250px",
          },
          Object {
            "data-test-subj": "toggle-custom-field-column",
            "name": "Toggle Label",
            "render": [Function],
            "width": "100px",
          },
        ],
        "isLoadingColumns": false,
        "rowHeader": "title",
      }
    `);
  });

  describe('ExternalServiceColumn ', () => {
    it('Not pushed render', () => {
      const wrapper = mount(
        <TestProviders>
          <ExternalServiceColumn
            theCase={useGetCasesMockState.data.cases[0]}
            connectors={connectors}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="case-table-column-external-notPushed"]`).last().exists()
      ).toBeTruthy();
    });

    it('Up to date', () => {
      const wrapper = mount(
        <TestProviders>
          <ExternalServiceColumn
            theCase={useGetCasesMockState.data.cases[1]}
            connectors={connectors}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="case-table-column-external-upToDate"]`).last().exists()
      ).toBeTruthy();
    });

    it('Needs update', () => {
      const wrapper = mount(
        <TestProviders>
          <ExternalServiceColumn
            theCase={useGetCasesMockState.data.cases[2]}
            connectors={connectors}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="case-table-column-external-requiresUpdate"]`).last().exists()
      ).toBeTruthy();
    });

    it('it does not throw when accessing the icon if the connector type is not registered', () => {
      // If the component throws the test will fail
      expect(() =>
        mount(
          <TestProviders>
            <ExternalServiceColumn
              theCase={useGetCasesMockState.data.cases[2]}
              connectors={[
                {
                  id: 'none',
                  actionTypeId: '.none',
                  name: 'None',
                  config: {},
                  isPreconfigured: false,
                  isSystemAction: false,
                  isDeprecated: false,
                },
              ]}
            />
          </TestProviders>
        )
      ).not.toThrowError();
    });

    it('shows the connectors icon if the user has read access to actions', async () => {
      const result = appMockRender.render(
        <ExternalServiceColumn
          theCase={useGetCasesMockState.data.cases[1]}
          connectors={connectors}
        />
      );

      expect(result.getByTestId('cases-table-connector-icon')).toBeInTheDocument();
    });

    it('hides the connectors icon if the user does not have read access to actions', async () => {
      appMockRender.coreStart.application.capabilities = {
        ...appMockRender.coreStart.application.capabilities,
        actions: { save: false, show: false },
      };

      const result = appMockRender.render(
        <ExternalServiceColumn
          theCase={useGetCasesMockState.data.cases[1]}
          connectors={connectors}
        />
      );

      expect(result.queryByTestId('cases-table-connector-icon')).toBe(null);
    });
  });
});
