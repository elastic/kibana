/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/public';
import { EuiButtonEmpty, EuiFormRow } from '@elastic/eui';
import type { ExpressionsStart, DatatableColumnType } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DatasourceDimensionEditorProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DataType,
  TableChangeType,
  DatasourceDimensionTriggerProps,
} from '../types';
import { generateId } from '../id_generator';
import { toExpression } from './to_expression';
import { TextBasedLanguagesDataPanel } from './datapanel';
import type {
  TextBasedLanguagesPrivateState,
  TextBasedLanguagesPersistedState,
  TextBasedLanguagesLayerColumn,
  TextBasedLanguageField,
} from './types';
import { FieldSelect } from './field_select';
import type { Datasource, IndexPatternMap } from '../types';
import { LayerPanel } from './layerpanel';

function getLayerReferenceName(layerId: string) {
  return `textBasedLanguages-datasource-layer-${layerId}`;
}

export function getTextBasedLanguagesDatasource({
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
  const getSuggestionsForState = (state: TextBasedLanguagesPrivateState) => {
    return Object.entries(state.layers)?.map(([id, layer]) => {
      return {
        state: {
          ...state,
        },
        table: {
          changeType: 'unchanged' as TableChangeType,
          isMultiRow: false,
          layerId: id,
          columns:
            layer.columns?.map((f) => {
              return {
                columnId: f.columnId,
                operation: {
                  dataType: f?.meta?.type as DataType,
                  label: f.fieldName,
                  isBucketed: Boolean(f?.meta?.type !== 'number'),
                },
              };
            }) ?? [],
        },
        keptLayerIds: [id],
      };
    });
  };
  const getSuggestionsForVisualizeField = (
    state: TextBasedLanguagesPrivateState,
    indexPatternId: string,
    fieldName: string,
    indexPatterns: IndexPatternMap
  ) => {
    const context = state.initialContext;
    if (context && 'dataViewSpec' in context && context.dataViewSpec.title) {
      const newLayerId = generateId();
      const indexPattern = indexPatterns[indexPatternId];

      const contextualFields = context.contextualFields;
      const newColumns = contextualFields?.map((c) => {
        let field = indexPattern?.getFieldByName(c);
        if (!field) {
          field = indexPattern?.fields.find((f) => f.name.includes(c));
        }
        const newId = generateId();
        const type = field?.type ?? 'number';
        return {
          columnId: newId,
          fieldName: c,
          meta: {
            type: type as DatatableColumnType,
          },
        };
      });

      const index = context.dataViewSpec.title;
      const query = context.query;
      const updatedState = {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: {
            index,
            query,
            columns: newColumns ?? [],
            allColumns: newColumns ?? [],
          },
        },
      };

      return [
        {
          state: {
            ...updatedState,
          },
          table: {
            changeType: 'initial' as TableChangeType,
            isMultiRow: false,
            layerId: newLayerId,
            columns:
              newColumns?.map((f) => {
                return {
                  columnId: f.columnId,
                  operation: {
                    dataType: f?.meta?.type as DataType,
                    label: f.fieldName,
                    isBucketed: Boolean(f?.meta?.type !== 'number'),
                  },
                };
              }) ?? [],
          },
          keptLayerIds: [newLayerId],
        },
      ];
    }

    return [];
  };
  const TextBasedLanguagesDatasource: Datasource<
    TextBasedLanguagesPrivateState,
    TextBasedLanguagesPersistedState
  > = {
    id: 'textBasedLanguages',

    checkIntegrity: () => {
      return [];
    },
    getErrorMessages: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors.map((err) => {
        return {
          shortMessage: err.message,
          longMessage: err.message,
        };
      });
    },
    getUnifiedSearchErrors: (state) => {
      const errors: Error[] = [];

      Object.values(state.layers).forEach((layer) => {
        if (layer.errors && layer.errors.length > 0) {
          errors.push(...layer.errors);
        }
      });
      return errors;
    },
    initialize(
      state?: TextBasedLanguagesPersistedState,
      savedObjectReferences?,
      context?,
      indexPatternRefs?,
      indexPatterns?
    ) {
      const patterns = indexPatterns ? Object.values(indexPatterns) : [];
      const refs = patterns.map((p) => {
        return {
          id: p.id,
          title: p.title,
          timeField: p.timeFieldName,
        };
      });

      const initState = state || { layers: {} };
      return {
        ...initState,
        fieldList: [],
        indexPatternRefs: refs,
        initialContext: context,
      };
    },
    onRefreshIndexPattern() {},

    getUsedDataViews: (state) => {
      return Object.values(state.layers).map(({ index }) => index);
    },

    getPersistableState({ layers }: TextBasedLanguagesPrivateState) {
      const savedObjectReferences: SavedObjectReference[] = [];
      Object.entries(layers).forEach(([layerId, { index, ...persistableLayer }]) => {
        if (index) {
          savedObjectReferences.push({
            type: 'index-pattern',
            id: index,
            name: getLayerReferenceName(layerId),
          });
        }
      });
      return { state: { layers }, savedObjectReferences };
    },
    isValidColumn(state, indexPatterns, layerId, columnId) {
      const layer = state.layers[layerId];
      const column = layer.columns.find((c) => c.columnId === columnId);
      const indexPattern = indexPatterns[layer.index];
      if (!column || !indexPattern) return false;
      return true;
    },
    insertLayer(state: TextBasedLanguagesPrivateState, newLayerId: string) {
      const layer = Object.values(state?.layers)?.[0];
      const query = layer?.query;
      const columns = layer?.allColumns ?? [];
      const index =
        layer?.index ??
        (JSON.parse(localStorage.getItem('lens-settings') || '{}').indexPatternId ||
          state.indexPatternRefs[0].id);
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(index, query, columns),
        },
      };
    },
    createEmptyLayer() {
      return {
        indexPatternRefs: [],
        layers: {},
        fieldList: [],
      };
    },

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
      };
    },

    removeLayer(state: TextBasedLanguagesPrivateState, layerId: string) {
      const newLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          columns: [],
        },
      };

      return {
        ...state,
        layers: newLayers,
        fieldList: state.fieldList,
      };
    },

    clearLayer(state: TextBasedLanguagesPrivateState, layerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: { ...state.layers[layerId], columns: [] },
        },
      };
    },

    getLayers(state: TextBasedLanguagesPrivateState) {
      return state && state.layers ? Object.keys(state?.layers) : [];
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          return Boolean(indexPatterns[layer.index]?.timeFieldName);
        })
      );
    },
    getUsedDataView: (state: TextBasedLanguagesPrivateState, layerId?: string) => {
      if (!layerId) {
        const layers = Object.values(state.layers);
        return layers?.[0]?.index;
      }
      return state.layers[layerId].index;
    },

    removeColumn({ prevState, layerId, columnId }) {
      return {
        ...prevState,
        layers: {
          ...prevState.layers,
          [layerId]: {
            ...prevState.layers[layerId],
            columns: prevState.layers[layerId].columns.filter((col) => col.columnId !== columnId),
          },
        },
      };
    },

    toExpression: (state, layerId, indexPatterns) => {
      return toExpression(state, layerId);
    },

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<TextBasedLanguagesPrivateState>
    ) {
      render(
        <I18nProvider>
          <TextBasedLanguagesDataPanel
            data={data}
            dataViews={dataViews}
            expressions={expressions}
            {...props}
          />
        </I18nProvider>,
        domElement
      );
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<TextBasedLanguagesPrivateState>
    ) => {
      const columnLabelMap = TextBasedLanguagesDatasource.uniqueLabels(props.state);
      const layer = props.state.layers[props.layerId];
      const selectedField = layer?.allColumns?.find((column) => column.columnId === props.columnId);
      let customLabel: string | undefined = columnLabelMap[props.columnId];
      if (!customLabel) {
        customLabel = selectedField?.fieldName;
      }

      const columnExists = props.state.fieldList.some((f) => f.name === selectedField?.fieldName);

      render(
        <EuiButtonEmpty
          color={columnExists ? 'primary' : 'danger'}
          onClick={() => {}}
          data-test-subj="lns-dimensionTrigger-textBased"
        >
          {customLabel ??
            i18n.translate('xpack.lens.textBasedLanguages.missingField', {
              defaultMessage: 'Missing field',
            })}
        </EuiButtonEmpty>,
        domElement
      );
    },

    getRenderEventCounters(state: TextBasedLanguagesPrivateState): string[] {
      return [];
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<TextBasedLanguagesPrivateState>
    ) => {
      const fields = props.state.fieldList;
      const selectedField = props.state.layers[props.layerId]?.allColumns?.find(
        (column) => column.columnId === props.columnId
      );
      render(
        <EuiFormRow
          data-test-subj="text-based-languages-field-selection-row"
          label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
            defaultMessage: 'Field',
          })}
          fullWidth
          className="lnsIndexPatternDimensionEditor--padded"
        >
          <FieldSelect
            existingFields={fields}
            selectedField={selectedField}
            onChoose={(choice) => {
              const meta = fields.find((f) => f.name === choice.field)?.meta;
              const newColumn = {
                columnId: props.columnId,
                fieldName: choice.field,
                meta,
              };
              return props.setState(
                !selectedField
                  ? {
                      ...props.state,
                      layers: {
                        ...props.state.layers,
                        [props.layerId]: {
                          ...props.state.layers[props.layerId],
                          columns: [...props.state.layers[props.layerId].columns, newColumn],
                          allColumns: [...props.state.layers[props.layerId].allColumns, newColumn],
                        },
                      },
                    }
                  : {
                      ...props.state,
                      layers: {
                        ...props.state.layers,
                        [props.layerId]: {
                          ...props.state.layers[props.layerId],
                          columns: props.state.layers[props.layerId].columns.map((col) =>
                            col.columnId !== props.columnId
                              ? col
                              : { ...col, fieldName: choice.field }
                          ),
                          allColumns: props.state.layers[props.layerId].allColumns.map((col) =>
                            col.columnId !== props.columnId
                              ? col
                              : { ...col, fieldName: choice.field }
                          ),
                        },
                      },
                    }
              );
            }}
          />
        </EuiFormRow>,
        domElement
      );
    },

    renderLayerPanel: (
      domElement: Element,
      props: DatasourceLayerPanelProps<TextBasedLanguagesPrivateState>
    ) => {
      render(
        <I18nProvider>
          <LayerPanel {...props} />
        </I18nProvider>,
        domElement
      );
    },

    uniqueLabels(state: TextBasedLanguagesPrivateState) {
      const layers = state.layers;
      const columnLabelMap = {} as Record<string, string>;
      const counts = {} as Record<string, number>;

      const makeUnique = (label: string) => {
        let uniqueLabel = label;

        while (counts[uniqueLabel] >= 0) {
          const num = ++counts[uniqueLabel];
          uniqueLabel = i18n.translate('xpack.lens.indexPattern.uniqueLabel', {
            defaultMessage: '{label} [{num}]',
            values: { label, num },
          });
        }

        counts[uniqueLabel] = 0;
        return uniqueLabel;
      };
      Object.values(layers).forEach((layer) => {
        if (!layer.columns) {
          return;
        }
        Object.values(layer.columns).forEach((column) => {
          columnLabelMap[column.columnId] = makeUnique(column.fieldName);
        });
      });

      return columnLabelMap;
    },

    getDropProps: (props) => {
      const { source } = props;
      if (!source) {
        return;
      }
      const label = source.field as string;
      return { dropTypes: ['field_add'], nextLabel: label };
    },

    onDrop: (props) => {
      const { dropType, state, source, target } = props;
      const { layers } = state;

      if (dropType === 'field_add') {
        Object.keys(layers).forEach((layerId) => {
          const currentLayer = layers[layerId];
          const field = currentLayer.allColumns.find((f) => f.columnId === source.id);
          const newColumn = {
            columnId: target.columnId,
            fieldName: field?.fieldName ?? '',
            meta: field?.meta,
          };
          const columns = currentLayer.columns.filter((c) => c.columnId !== target.columnId);
          columns.push(newColumn);

          const allColumns = currentLayer.allColumns.filter((c) => c.columnId !== target.columnId);
          allColumns.push(newColumn);

          props.setState({
            ...props.state,
            layers: {
              ...props.state.layers,
              [layerId]: {
                ...props.state.layers[layerId],
                columns,
                allColumns,
              },
            },
          });
        });
        return true;
      }
      return false;
    },

    getPublicAPI({ state, layerId }: PublicAPIProps<TextBasedLanguagesPrivateState>) {
      return {
        datasourceId: 'textBasedLanguages',

        getTableSpec: () => {
          return (
            state.layers[layerId]?.columns?.map((column) => ({
              columnId: column.columnId,
              fields: [column.fieldName],
            })) || []
          );
        },
        getOperationForColumnId: (columnId: string) => {
          const layer = state.layers[layerId];
          const column = layer?.allColumns?.find((c) => c.columnId === columnId);
          const columnLabelMap = TextBasedLanguagesDatasource.uniqueLabels(state);

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: columnLabelMap[columnId] ?? column?.fieldName,
              isBucketed: Boolean(column?.meta?.type !== 'number'),
              hasTimeShift: false,
            };
          }
          return null;
        },
        getVisualDefaults: () => ({}),
        isTextBasedLanguage: () => true,
        getMaxPossibleNumValues: (columnId) => {
          return null;
        },
        getSourceId: () => {
          const layer = state.layers[layerId];
          return layer.index;
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
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      const field = state.fieldList.find(
        (f) => f.id === (draggedField as TextBasedLanguageField).id
      );
      if (!field) return [];
      return Object.entries(state.layers)?.map(([id, layer]) => {
        const newId = generateId();
        const newColumn = {
          columnId: newId,
          fieldName: field?.name ?? '',
          meta: field?.meta,
        };
        return {
          state: {
            ...state,
            layers: {
              ...state.layers,
              [id]: {
                ...state.layers[id],
                columns: [...layer.columns, newColumn],
                allColumns: [...layer.allColumns, newColumn],
              },
            },
          },
          table: {
            changeType: 'initial' as TableChangeType,
            isMultiRow: false,
            layerId: id,
            columns: [
              ...layer.columns?.map((f) => {
                return {
                  columnId: f.columnId,
                  operation: {
                    dataType: f?.meta?.type as DataType,
                    label: f.fieldName,
                    isBucketed: Boolean(f?.meta?.type !== 'number'),
                  },
                };
              }),
              {
                columnId: newId,
                operation: {
                  dataType: field?.meta?.type as DataType,
                  label: field?.name ?? '',
                  isBucketed: Boolean(field?.meta?.type !== 'number'),
                },
              },
            ],
          },
          keptLayerIds: [id],
        };
      });
      return [];
    },
    getDatasourceSuggestionsForVisualizeField: getSuggestionsForVisualizeField,
    getDatasourceSuggestionsFromCurrentState: getSuggestionsForState,
    getDatasourceSuggestionsForVisualizeCharts: getSuggestionsForState,
    isEqual: () => true,
  };

  return TextBasedLanguagesDatasource;
}

function blankLayer(
  index: string,
  query?: AggregateQuery,
  columns?: TextBasedLanguagesLayerColumn[]
) {
  return {
    index,
    query,
    columns: [],
    allColumns: columns ?? [],
  };
}
