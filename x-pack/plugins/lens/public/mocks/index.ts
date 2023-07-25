/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DragContextState, DragContextValue } from '@kbn/dom-drag-drop';
import { createMockDataViewsState } from '../data_views_service/mocks';
import { FramePublicAPI, FrameDatasourceAPI } from '../types';
export { mockDataPlugin } from './data_plugin_mock';
export {
  visualizationMap,
  createMockVisualization,
  mockVisualizationMap,
} from './visualization_mock';
export { datasourceMap, mockDatasourceMap, createMockDatasource } from './datasource_mock';
export type { DatasourceMock } from './datasource_mock';
export { createExpressionRendererMock } from './expression_renderer_mock';
export { defaultDoc, exactMatchDoc, makeDefaultServices } from './services_mock';
export type { MountStoreProps } from './store_mocks';
export {
  mockStoreDeps,
  mockDatasourceStates,
  defaultState,
  makeLensStore,
  mountWithProvider,
  getMountWithProviderParams,
} from './store_mocks';
export { lensPluginMock } from './lens_plugin_mock';

export type FrameMock = jest.Mocked<FramePublicAPI>;

export const createMockFramePublicAPI = ({
  datasourceLayers,
  dateRange,
  dataViews,
  activeData,
}: Partial<Omit<FramePublicAPI, 'dataViews'>> & {
  dataViews?: Partial<FramePublicAPI['dataViews']>;
} = {}): FrameMock => ({
  datasourceLayers: datasourceLayers ?? {},
  dateRange: dateRange ?? {
    fromDate: '2022-03-17T08:25:00.000Z',
    toDate: '2022-04-17T08:25:00.000Z',
  },
  dataViews: createMockDataViewsState(dataViews),
  activeData,
});

export type FrameDatasourceMock = jest.Mocked<FrameDatasourceAPI>;

export const createMockFrameDatasourceAPI = ({
  datasourceLayers,
  dateRange,
  dataViews,
  query,
  filters,
}: Partial<FrameDatasourceAPI> = {}): FrameDatasourceMock => ({
  datasourceLayers: datasourceLayers ?? {},
  dateRange: dateRange ?? {
    fromDate: '2022-03-17T08:25:00.000Z',
    toDate: '2022-04-17T08:25:00.000Z',
  },
  query: query ?? { query: '', language: 'lucene' },
  filters: filters ?? [],
  dataViews: createMockDataViewsState(dataViews),
});

export function createMockedDragDropContext(
  partialState?: Partial<DragContextState>,
  setState?: jest.Mocked<DragContextValue>[1]
): jest.Mocked<DragContextValue> {
  return [
    {
      dataTestSubjPrefix: 'lnsDragDrop',
      dragging: undefined,
      keyboardMode: false,
      activeDropTarget: undefined,
      dropTargetsByOrder: undefined,
      ...partialState,
    },
    setState ? setState : jest.fn(),
  ];
}
