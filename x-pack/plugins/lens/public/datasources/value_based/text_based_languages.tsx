/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectReference } from '@kbn/core/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import { toExpression } from './to_expression';
import {
  DatasourceDimensionEditorProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DatasourceDimensionTriggerProps,
  UserMessage,
} from '../../types';
import type {
  ValueBasedPrivateState,
  ValueBasedPersistedState,
  ValueBasedLayerColumn,
} from './types';
import type { Datasource } from '../../types';
import { getUniqueLabelGenerator, nonNullable } from '../../utils';

const getSelectedFieldsFromColumns = memoizeOne(
  (columns: ValueBasedLayerColumn[]) =>
    columns
      .map((c) => {
        if ('fieldName' in c) {
          return c.fieldName;
        }
      })
      .filter(nonNullable),
  isEqual
);

export function getValueBasedDatasource({
  core,
  storage,
  data,
  expressions,
  dataViews,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  dataViews: DataViewsPublicPluginStart;
}) {
  const ValueBasedDatasource: Datasource<ValueBasedPrivateState, ValueBasedPersistedState> = {
    id: 'valueBased',

    checkIntegrity: () => {
      return [];
    },
    removeColumn: (props) => {
      return props.prevState;
    },
    onDrop: () => {
      return undefined;
    },
    getDropProps: () => {
      return undefined;
    },
    getUserMessages: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors.map((err) => {
        const message: UserMessage = {
          severity: 'error',
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }, { id: 'textBasedLanguagesQueryInput' }],
          shortMessage: err.message,
          longMessage: err.message,
        };
        return message;
      });
    },
    initialize(state?: ValueBasedPersistedState, savedObjectReferences?, context?) {
      const initState = state || { layers: {} };
      return {
        ...initState,
        initialContext: context,
      };
    },

    syncColumns({ state }) {
      return state;
    },

    onRefreshIndexPattern() {},

    getUsedDataViews: () => {
      return [];
    },

    getPersistableState({ layers }: ValueBasedPrivateState) {
      return { state: { layers }, savedObjectReferences: [] };
    },
    insertLayer(state: ValueBasedPrivateState, newLayerId: string) {
      return state;
    },
    createEmptyLayer() {
      return {
        layers: {},
        fieldList: [],
      };
    },

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
      };
    },

    removeLayer(state: ValueBasedPrivateState, layerId: string) {
      const newLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          columns: [],
        },
      };

      return {
        removedLayerIds: [layerId],
        newState: {
          ...state,
          layers: newLayers,
          fieldList: state.fieldList,
        },
      };
    },

    clearLayer(state: ValueBasedPrivateState, layerId: string) {
      return {
        removedLayerIds: [],
        newState: {
          ...state,
          layers: {
            ...state.layers,
            [layerId]: { ...state.layers[layerId], columns: [] },
          },
        },
      };
    },

    getLayers(state: ValueBasedPrivateState) {
      return state && state.layers ? Object.keys(state?.layers) : [];
    },
    isTimeBased: (state, indexPatterns) => {
      return false;
    },
    getUsedDataView: (state: ValueBasedPrivateState, layerId?: string) => {
      return '';
    },

    toExpression: (state, layerId, indexPatterns, dateRange, searchSessionId) => {
      return toExpression(state, layerId);
    },
    getSelectedFields(state) {
      return getSelectedFieldsFromColumns(
        Object.values(state?.layers)?.flatMap((l) => Object.values(l.columns))
      );
    },

    DataPanelComponent(props: DatasourceDataPanelProps<ValueBasedPrivateState>) {
      return null;
    },

    DimensionTriggerComponent: (props: DatasourceDimensionTriggerProps<ValueBasedPrivateState>) => {
      return null;
    },

    getRenderEventCounters(state: ValueBasedPrivateState): string[] {
      return [];
    },

    DimensionEditorComponent: (props: DatasourceDimensionEditorProps<ValueBasedPrivateState>) => {
      return null;
    },

    LayerPanelComponent: (props: DatasourceLayerPanelProps<ValueBasedPrivateState>) => {
      return null;
    },

    uniqueLabels(state: ValueBasedPrivateState) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;
      const uniqueLabelGenerator = getUniqueLabelGenerator();

      Object.values(layers).forEach((layer) => {
        if (!layer.columns) {
          return;
        }
        Object.values(layer.columns).forEach((column) => {
          columnLabelMap[column.columnId] = uniqueLabelGenerator(column.fieldName);
        });
      });

      return columnLabelMap;
    },
    getPublicAPI({ state, layerId, indexPatterns }: PublicAPIProps<ValueBasedPrivateState>) {
      return {
        datasourceId: 'ValueBased',
        isTextBasedLanguage: () => true,
        getTableSpec: () => {
          const columns = state.layers[layerId]?.columns.filter((c) => {
            const columnExists = state?.fieldList?.some((f) => f.name === c?.fieldName);
            if (columnExists) return c;
          });
          return (
            columns.map((column) => ({
              columnId: column.columnId,
              fields: [column.fieldName],
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          return null;
        },
        getVisualDefaults: () => ({}),
        isValueBasedLanguage: () => true,
        getMaxPossibleNumValues: (columnId) => {
          return null;
        },
        getSourceId: () => {
          return undefined;
        },
        getFilters: () => {
          return {
            enabled: {
              kuery: [],
              lucene: [],
            },
            disabled: {
              kuery: [],
              lucene: [],
            },
          };
        },
        hasDefaultTimeField: () => false,
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      return [];
    },
    getDatasourceSuggestionsForVisualizeField: () => {
      return [];
    },
    getDatasourceSuggestionsFromCurrentState: () => [],
    getDatasourceSuggestionsForVisualizeCharts: () => [],
    isEqual: (
      persistableState1: ValueBasedPersistedState,
      references1: SavedObjectReference[],
      persistableState2: ValueBasedPersistedState,
      references2: SavedObjectReference[]
    ) => isEqual(persistableState1, persistableState2),
    getDatasourceInfo: async (state, references, dataViewsService) => {
      return [];
    },
  };

  return ValueBasedDatasource;
}
