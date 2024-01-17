/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import type { FilterConfig, FilterConfigRenderParams } from './types';
import { getCaseConfigure } from '../../../containers/configure/api';
import { useFilterConfig } from './use_filter_config';
import type { FilterOptions } from '../../../../common/ui';

jest.mock('../../../containers/configure/api', () => {
  const originalModule = jest.requireActual('../../../containers/configure/api');
  return {
    ...originalModule,
    getCaseConfigure: jest.fn(),
  };
});

const emptyFilterOptions: FilterOptions = {
  search: '',
  searchFields: [],
  severity: [],
  status: [],
  tags: [],
  assignees: [],
  reporters: [],
  owner: [],
  category: [],
  customFields: {},
};
const getCaseConfigureMock = getCaseConfigure as jest.Mock;

describe('useFilterConfig', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should remove a selected option if the filter is deleted', async () => {
    getCaseConfigureMock.mockReturnValue(() => {
      return [];
    });
    const onFilterOptionsChange = jest.fn();
    const getEmptyOptions = jest.fn().mockReturnValue({ severity: [] });
    const filters: FilterConfig[] = [
      {
        key: 'severity',
        label: 'Severity',
        isActive: true,
        isAvailable: true,
        getEmptyOptions,
        render: ({ filterOptions }: FilterConfigRenderParams) => null,
      },
      {
        key: 'tags',
        label: 'Tags',
        isActive: true,
        isAvailable: true,
        getEmptyOptions() {
          return { tags: ['initialValue'] };
        },
        render: ({ filterOptions }: FilterConfigRenderParams) => null,
      },
    ];

    const { rerender } = renderHook(useFilterConfig, {
      wrapper: ({ children }) => <appMockRender.AppWrapper>{children}</appMockRender.AppWrapper>,
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: emptyFilterOptions,
      },
    });

    expect(onFilterOptionsChange).not.toHaveBeenCalled();
    rerender({
      systemFilterConfig: [],
      onFilterOptionsChange,
      isSelectorView: false,
      filterOptions: emptyFilterOptions,
    });
    expect(getEmptyOptions).toHaveBeenCalledTimes(1);
    expect(onFilterOptionsChange).toHaveBeenCalledTimes(1);
    expect(onFilterOptionsChange).toHaveBeenCalledWith({
      severity: [],
      tags: ['initialValue'],
    });
  });
});
