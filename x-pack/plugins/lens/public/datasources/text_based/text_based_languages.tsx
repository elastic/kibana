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
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { ExpressionsStart, DatatableColumnType } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  DatasourceDimensionEditorProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  DataType,
  TableChangeType,
  DatasourceDimensionTriggerProps,
  DataSourceInfo,
} from '../../types';
import { generateId } from '../../id_generator';
import { toExpression } from './to_expression';
import { TextBasedDataPanel } from './datapanel';
import type {
  TextBasedPrivateState,
  TextBasedPersistedState,
  TextBasedLayerColumn,
  TextBasedField,
} from './types';
import { FieldSelect } from './field_select';
import type { Datasource, IndexPatternMap } from '../../types';
import { LayerPanel } from './layerpanel';

function getLayerReferenceName(layerId: string) {
  return `textBasedLanguages-datasource-layer-${layerId}`;
}

export function getTextBasedDatasource({
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
  const getSuggestionsForState = (state: TextBasedPrivateState) => {
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
    state: TextBasedPrivateState,
    indexPatternId: string,
    fieldName: string,
    indexPatterns: IndexPatternMap
  ) => {
    const context = state.initialContext;
    // on text based mode we offer suggestions for the query and not for a specific field
    if (fieldName) return [];
    if (context && 'dataViewSpec' in context && context.dataViewSpec.title && context.query) {
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
  const TextBasedDatasource: Datasource<TextBasedPrivateState, TextBasedPersistedState> = {
    id: 'textBased',

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
      state?: TextBasedPersistedState,
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

    syncColumns({ state }) {
      // TODO implement this for real
      return state;
    },

    onRefreshIndexPattern() {},

    getUsedDataViews: (state) => {
      return Object.values(state.layers).map(({ index }) => index);
    },

    getPersistableState({ layers }: TextBasedPrivateState) {
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
    insertLayer(state: TextBasedPrivateState, newLayerId: string) {
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

    removeLayer(state: TextBasedPrivateState, layerId: string) {
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

    clearLayer(state: TextBasedPrivateState, layerId: string) {
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

    getLayers(state: TextBasedPrivateState) {
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
    getUsedDataView: (state: TextBasedPrivateState, layerId?: string) => {
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
    getSelectedFields(state) {
      const fields: string[] = [];
      Object.values(state?.layers)?.forEach((l) => {
        const { columns } = l;
        Object.values(columns).forEach((c) => {
          if ('fieldName' in c) {
            fields.push(c.fieldName);
          }
        });
      });
      return fields;
    },

    renderDataPanel(domElement: Element, props: DatasourceDataPanelProps<TextBasedPrivateState>) {
      const layerFields = TextBasedDatasource?.getSelectedFields?.(props.state);
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <TextBasedDataPanel
              data={data}
              dataViews={dataViews}
              expressions={expressions}
              layerFields={layerFields}
              {...props}
            />
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<TextBasedPrivateState>
    ) => {
      const columnLabelMap = TextBasedDatasource.uniqueLabels(props.state);
      const layer = props.state.layers[props.layerId];
      const selectedField = layer?.allColumns?.find((column) => column.columnId === props.columnId);
      let customLabel: string | undefined = columnLabelMap[props.columnId];
      if (!customLabel) {
        customLabel = selectedField?.fieldName;
      }

      render(
        <EuiButtonEmpty
          color={customLabel && selectedField ? 'primary' : 'danger'}
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

    getRenderEventCounters(state: TextBasedPrivateState): string[] {
      return [];
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<TextBasedPrivateState>
    ) => {
      const fields = props.state.fieldList;
      const selectedField = props.state.layers[props.layerId]?.allColumns?.find(
        (column) => column.columnId === props.columnId
      );

      const updatedFields = fields.map((f) => {
        return {
          ...f,
          compatible: props.isMetricDimension
            ? props.filterOperations({
                dataType: f.meta.type as DataType,
                isBucketed: Boolean(f?.meta?.type !== 'number'),
                scale: 'ordinal',
              })
            : true,
        };
      });
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <EuiFormRow
            data-test-subj="text-based-languages-field-selection-row"
            label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
              defaultMessage: 'Field',
            })}
            fullWidth
            className="lnsIndexPatternDimensionEditor--padded"
          >
            <FieldSelect
              existingFields={updatedFields}
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
                            allColumns: [
                              ...props.state.layers[props.layerId].allColumns,
                              newColumn,
                            ],
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
                                : { ...col, fieldName: choice.field, meta }
                            ),
                            allColumns: props.state.layers[props.layerId].allColumns.map((col) =>
                              col.columnId !== props.columnId
                                ? col
                                : { ...col, fieldName: choice.field, meta }
                            ),
                          },
                        },
                      }
                );
              }}
            />
          </EuiFormRow>
          {props.dataSectionExtra && (
            <div
              style={{
                paddingLeft: euiThemeVars.euiSize,
                paddingRight: euiThemeVars.euiSize,
              }}
            >
              {props.dataSectionExtra}
            </div>
          )}
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderLayerPanel: (
      domElement: Element,
      props: DatasourceLayerPanelProps<TextBasedPrivateState>
    ) => {
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <LayerPanel {...props} />
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    uniqueLabels(state: TextBasedPrivateState) {
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
      const { source, target, state } = props;
      if (!source) {
        return;
      }
      if (target && target.isMetricDimension) {
        const layerId = target.layerId;
        const currentLayer = state.layers[layerId];
        const field = currentLayer.allColumns.find((f) => f.columnId === source.id);
        if (field?.meta?.type !== 'number') return;
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

    getPublicAPI({ state, layerId }: PublicAPIProps<TextBasedPrivateState>) {
      return {
        datasourceId: 'textBased',

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
          const layer = state.layers[layerId];
          const column = layer?.allColumns?.find((c) => c.columnId === columnId);
          const columnLabelMap = TextBasedDatasource.uniqueLabels(state);

          if (column) {
            return {
              dataType: column?.meta?.type as DataType,
              label: columnLabelMap[columnId] ?? column?.fieldName,
              isBucketed: Boolean(column?.meta?.type !== 'number'),
              hasTimeShift: false,
              hasReducedTimeRange: false,
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
        hasDefaultTimeField: () => false,
      };
    },
    getDatasourceSuggestionsForField(state, draggedField) {
      const field = state.fieldList.find((f) => f.id === (draggedField as TextBasedField).id);
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
    getDatasourceInfo: async (state, references, dataViewsService) => {
      const indexPatterns: DataView[] = [];
      for (const { index } of Object.values(state.layers)) {
        const dataView = await dataViewsService?.get(index);
        if (dataView) {
          indexPatterns.push(dataView);
        }
      }
      return Object.entries(state.layers).reduce<DataSourceInfo[]>((acc, [key, layer]) => {
        const columns = Object.entries(layer.columns).map(([colId, col]) => {
          return {
            id: colId,
            role: col.meta?.type !== 'number' ? ('split' as const) : ('metric' as const),
            operation: {
              dataType: col?.meta?.type as DataType,
              label: col.fieldName,
              isBucketed: Boolean(col?.meta?.type !== 'number'),
              hasTimeShift: false,
              hasReducedTimeRange: false,
              fields: [col.fieldName],
              type: col.meta?.type || 'unknown',
              filter: undefined,
            },
          };
        });

        acc.push({
          layerId: key,
          columns,
          dataView: indexPatterns?.find((dataView) => dataView.id === layer.index),
        });

        return acc;
      }, []);
    },
  };

  return TextBasedDatasource;
}

function blankLayer(index: string, query?: AggregateQuery, columns?: TextBasedLayerColumn[]) {
  return {
    index,
    query,
    columns: [],
    allColumns: columns ?? [],
  };
}
