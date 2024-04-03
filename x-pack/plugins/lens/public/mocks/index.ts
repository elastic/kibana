/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DragContextState, DragContextValue } from '@kbn/dom-drag-drop';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { createMockDataViewsState } from '../data_views_service/mocks';
import { FramePublicAPI } from '../types';
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
  renderWithReduxStore,
} from './store_mocks';
export { lensPluginMock } from './lens_plugin_mock';
export { mockDataViewWithTimefield } from './dataview_mock';
export { mockAllSuggestions } from './suggestions_mock';

export type FrameMock = jest.Mocked<FramePublicAPI>;

export const createMockFramePublicAPI = (overrides: Partial<FramePublicAPI> = {}): FrameMock => ({
  datasourceLayers: {},
  dateRange: {
    fromDate: '2022-03-17T08:25:00.000Z',
    toDate: '2022-04-17T08:25:00.000Z',
  },
  dataViews: createMockDataViewsState(),
  query: { query: '', language: 'lucene' },
  filters: [],
  ...overrides,
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
      hoveredDropTarget: undefined,
      dropTargetsByOrder: undefined,
      ...partialState,
    },
    setState ? setState : jest.fn(),
  ];
}

export function generateActiveData(
  json: Array<{
    id: string;
    rows: Array<Record<string, number | null>>;
  }>
) {
  return json.reduce((memo, { id, rows }) => {
    const columns = Object.keys(rows[0]).map((columnId) => ({
      id: columnId,
      name: columnId,
      meta: {
        type: typeof rows[0][columnId]! as DatatableColumnType,
      },
    }));
    memo[id] = {
      type: 'datatable' as const,
      columns,
      rows,
    };
    return memo;
  }, {} as NonNullable<FramePublicAPI['activeData']>);
}
