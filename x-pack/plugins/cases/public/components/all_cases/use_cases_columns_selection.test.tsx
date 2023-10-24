/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook } from '@testing-library/react-hooks';

import type { AppMockRenderer } from '../../common/mock';

import { createAppMockRenderer } from '../../common/mock';
import { useCasesColumnsSelection } from './use_cases_columns_selection';
import { mergeSelectedColumnsWithConfiguration } from './utils';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { DEFAULT_CASES_TABLE_COLUMNS } from '../../../common/constants';

jest.mock('./use_cases_columns_configuration');
jest.mock('./utils');

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;
const mergeSelectedColumnsWithConfigurationMock =
  mergeSelectedColumnsWithConfiguration as jest.Mock;

const localStorageKey = 'testAppId.cases.list.tableColumns';
const casesColumnsConfig = {
  title: {
    field: 'title',
    name: 'Name',
    isChecked: false,
  },
  assignees: {
    field: 'assignees',
    name: 'Assignees',
    isChecked: false,
  },
  tags: {
    field: 'tags',
    name: 'Tags',
    isChecked: false,
  },
};

describe('useCasesColumnsSelection ', () => {
  let appMockRender: AppMockRenderer;
  const license = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  beforeEach(() => {
    appMockRender = createAppMockRenderer({ license });

    useCasesColumnsConfigurationMock.mockReturnValue(casesColumnsConfig);
    mergeSelectedColumnsWithConfigurationMock.mockReturnValue([
      {
        field: 'title',
        name: 'Name',
        isChecked: true,
      },
      {
        field: 'assignees',
        name: 'Assignees',
        isChecked: true,
      },
      {
        field: 'tags',
        name: 'Tags',
        isChecked: true,
      },
    ]);

    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected selectedColumns', async () => {
    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "selectedColumns": Array [
          Object {
            "field": "title",
            "isChecked": true,
            "name": "Name",
          },
          Object {
            "field": "assignees",
            "isChecked": true,
            "name": "Assignees",
          },
          Object {
            "field": "tags",
            "isChecked": true,
            "name": "Tags",
          },
        ],
        "setSelectedColumns": [Function],
      }
    `);
  });

  it('calls mergeSelectedColumnsWithConfiguration with existing localstorage value', async () => {
    const selectedColumns = [
      {
        field: 'title',
        name: 'Name',
        isChecked: false,
      },
    ];

    localStorage.setItem(localStorageKey, JSON.stringify(selectedColumns));

    renderHook(() => useCasesColumnsSelection(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(mergeSelectedColumnsWithConfigurationMock).toBeCalledWith({
      selectedColumns,
      casesColumnsConfig,
    });
  });

  it('calls mergeSelectedColumnsWithConfiguration with the default params when the localstorage is empty', async () => {
    renderHook(() => useCasesColumnsSelection(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(mergeSelectedColumnsWithConfigurationMock).toBeCalledWith({
      selectedColumns: DEFAULT_CASES_TABLE_COLUMNS,
      casesColumnsConfig,
    });
  });
});
