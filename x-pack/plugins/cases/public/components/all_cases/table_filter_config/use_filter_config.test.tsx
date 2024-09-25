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
import { useFilterConfig } from './use_filter_config';
import type { FilterOptions } from '../../../../common/ui';
import { CUSTOM_FIELD_KEY_PREFIX } from '../constants';
import { CustomFieldTypes } from '../../../../common/types/domain';

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

describe('useFilterConfig', () => {
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

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should remove a selected option if the filter is deleted', async () => {
    const { rerender } = renderHook(useFilterConfig, {
      wrapper: ({ children }: React.PropsWithChildren<Parameters<typeof useFilterConfig>[0]>) => (
        <appMockRender.AppWrapper>{children}</appMockRender.AppWrapper>
      ),
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: emptyFilterOptions,
        customFields: [],
        isLoading: false,
      },
    });

    expect(onFilterOptionsChange).not.toHaveBeenCalled();

    rerender({
      systemFilterConfig: [],
      onFilterOptionsChange,
      isSelectorView: false,
      filterOptions: emptyFilterOptions,
      customFields: [],
      isLoading: false,
    });

    expect(getEmptyOptions).toHaveBeenCalledTimes(1);
    expect(onFilterOptionsChange).toHaveBeenCalledTimes(1);
    expect(onFilterOptionsChange).toHaveBeenCalledWith({
      severity: [],
      tags: ['initialValue'],
    });
  });

  it('should activate custom fields correctly when they are hidden', async () => {
    const customFieldKey = 'toggleKey';
    const uiCustomFieldKey = `${CUSTOM_FIELD_KEY_PREFIX}${customFieldKey}`;

    localStorage.setItem(
      'securitySolution.cases.list.tableFiltersConfig',
      JSON.stringify([{ key: uiCustomFieldKey, isActive: false }])
    );

    const { result } = renderHook(useFilterConfig, {
      wrapper: ({ children }: React.PropsWithChildren<Parameters<typeof useFilterConfig>[0]>) => (
        <appMockRender.AppWrapper>{children}</appMockRender.AppWrapper>
      ),
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          customFields: { [customFieldKey]: { type: CustomFieldTypes.TOGGLE, options: ['on'] } },
        },
        customFields: [
          {
            key: customFieldKey,
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'My toggle',
          },
        ],
        isLoading: false,
      },
    });

    expect(result.current.activeSelectableOptionKeys).toEqual([uiCustomFieldKey]);
  });
});
