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

jest.mock('../../../containers/configure/api', () => {
  const originalModule = jest.requireActual('../../../containers/configure/api');
  return {
    ...originalModule,
    getCaseConfigure: jest.fn(),
  };
});

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
    const deactivateCb = jest.fn();
    const filters: FilterConfig[] = [
      {
        key: 'severity',
        label: 'Severity',
        isActive: true,
        isAvailable: true,
        deactivate: deactivateCb,
        render: ({ filterOptions, onChange }: FilterConfigRenderParams) => null,
      },
    ];

    const { rerender } = renderHook(useFilterConfig, {
      wrapper: ({ children }) => <appMockRender.AppWrapper>{children}</appMockRender.AppWrapper>,
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionChange: () => {},
        isSelectorView: false,
      },
    });

    expect(deactivateCb).not.toHaveBeenCalled();
    rerender({ systemFilterConfig: [], onFilterOptionChange: () => {}, isSelectorView: false });
    expect(deactivateCb).toHaveBeenCalled();
  });
});
