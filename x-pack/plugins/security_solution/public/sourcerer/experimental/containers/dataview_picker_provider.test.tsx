/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch } from 'react-redux';
import { useKibana } from '../../../common/lib/kibana';
import { DataViewPickerProvider } from './dataview_picker_provider';
import {
  startAppListening,
  listenerMiddleware,
  createChangeDataviewListener,
  createInitDataviewListener,
} from '../redux/listeners';
import { init } from '../redux/actions';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../redux/listeners', () => ({
  listenerMiddleware: {
    clearListeners: jest.fn(),
  },
  startAppListening: jest.fn(),
  createChangeDataviewListener: jest.fn(),
  createInitDataviewListener: jest.fn(),
}));

describe('DataviewPickerProvider', () => {
  const mockDispatch = jest.fn();
  const mockServices = {
    dataViews: {} as unknown as DataViewsServicePublic,
  };

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useKibana as jest.Mock).mockReturnValue({ services: mockServices });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('starts listeners and dispatches init action on mount', () => {
    render(
      <DataViewPickerProvider>
        <div>{`Test Child`}</div>
      </DataViewPickerProvider>
    );

    expect(startAppListening).toHaveBeenCalledWith(createInitDataviewListener({}));
    expect(startAppListening).toHaveBeenCalledWith(
      createChangeDataviewListener({ dataViewsService: mockServices.dataViews })
    );
    expect(mockDispatch).toHaveBeenCalledWith(init(DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID));
  });

  test('clears listeners on unmount', () => {
    const { unmount } = render(
      <DataViewPickerProvider>
        <div>{`Test Child`}</div>
      </DataViewPickerProvider>
    );

    unmount();

    expect(listenerMiddleware.clearListeners).toHaveBeenCalled();
  });
});
