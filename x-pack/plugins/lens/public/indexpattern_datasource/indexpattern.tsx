/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart, SavedObjectReference } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { flatten, isEqual } from 'lodash';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DataPublicPluginStart, ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import type {
  DatasourceDimensionEditorProps,
  DatasourceDimensionTriggerProps,
  DatasourceDataPanelProps,
  DatasourceLayerPanelProps,
  PublicAPIProps,
  OperationDescriptor,
  FramePublicAPI,
  IndexPatternField,
  IndexPattern,
  IndexPatternRef,
} from '../types';
import {
  changeIndexPattern,
  changeLayerIndexPattern,
  extractReferences,
  injectReferences,
  loadInitialState,
  onRefreshIndexPattern,
  renameIndexPattern,
  triggerActionOnIndexPatternChange,
} from './loader';
import { toExpression } from './to_expression';
import {
  IndexPatternDimensionTrigger,
  IndexPatternDimensionEditor,
  getDropProps,
  onDrop,
} from './dimension_panel';
import { IndexPatternDataPanel } from './datapanel';
import {
  getDatasourceSuggestionsForField,
  getDatasourceSuggestionsFromCurrentState,
  getDatasourceSuggestionsForVisualizeField,
  getDatasourceSuggestionsForVisualizeCharts,
} from './indexpattern_suggestions';

import {
  getFiltersInLayer,
  getTSDBRollupWarningMessages,
  getVisualDefaultsForLayer,
  isColumnInvalid,
  cloneLayer,
} from './utils';
import { normalizeOperationDataType, isDraggedField } from './pure_utils';
import { LayerPanel } from './layerpanel';
import {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  getErrorMessages,
  insertNewColumn,
  operationDefinitionMap,
  TermsIndexPatternColumn,
} from './operations';
import { getReferenceRoot } from './operations/layer_helpers';
import { IndexPatternPrivateState, IndexPatternPersistedState } from './types';
import { mergeLayer } from './state_helpers';
import { Datasource, VisualizeEditorContext } from '../types';
import { deleteColumn, isReferenced } from './operations';
import { GeoFieldWorkspacePanel } from '../editor_frame_service/editor_frame/workspace_panel/geo_field_workspace_panel';
import { DraggingIdentifier } from '../drag_drop';
import { getStateTimeShiftWarningMessages } from './time_shift_utils';
import { getPrecisionErrorWarningMessages } from './utils';
import { DOCUMENT_FIELD_NAME } from '../../common/constants';
import { isColumnOfType } from './operations/definitions/helpers';
export type { OperationType, GenericIndexPatternColumn } from './operations';
export { deleteColumn } from './operations';

export function columnToOperation(
  column: GenericIndexPatternColumn,
  uniqueLabel?: string,
  dataView?: IndexPattern
): OperationDescriptor {
  const { dataType, label, isBucketed, scale, operationType, timeShift } = column;
  const fieldTypes =
    'sourceField' in column ? dataView?.getFieldByName(column.sourceField)?.esTypes : undefined;
  return {
    dataType: normalizeOperationDataType(dataType),
    isBucketed,
    scale,
    label: uniqueLabel || label,
    isStaticValue: operationType === 'static_value',
    sortingHint:
      column.dataType === 'string' && fieldTypes?.includes(ES_FIELD_TYPES.VERSION)
        ? 'version'
        : undefined,
    hasTimeShift: Boolean(timeShift),
    interval: isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column)
      ? column.params.interval
      : undefined,
  };
}

export type { FormatColumnArgs, TimeScaleArgs, CounterRateArgs } from '../../common/expressions';

export {
  getSuffixFormatter,
  unitSuffixesLong,
  suffixFormatterId,
} from '../../common/suffix_formatter';

export function getIndexPatternDatasource({
  core,
  storage,
  data,
  unifiedSearch,
  dataViews,
  fieldFormats,
  charts,
  dataViewFieldEditor,
  uiActions,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
}) {
  const uiSettings = core.uiSettings;

  const DATASOURCE_ID = 'indexpattern';

  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    id: DATASOURCE_ID,

    initialize(
      persistedState?: IndexPatternPersistedState,
      references?: SavedObjectReference[],
      initialContext?: VisualizeFieldContext | VisualizeEditorContext,
      indexPatternRefs?: IndexPatternRef[],
      indexPatterns?: Record<string, IndexPattern>
    ) {
      return loadInitialState({
        persistedState,
        references,
        defaultIndexPatternId: core.uiSettings.get('defaultIndex'),
        storage,
        initialContext,
        indexPatternRefs,
        indexPatterns,
      });
    },

    getPersistableState(state: IndexPatternPrivateState) {
      return extractReferences(state);
    },

    getCurrentIndexPatternId(state: IndexPatternPrivateState) {
      return state.currentIndexPatternId;
    },

    insertLayer(state: IndexPatternPrivateState, newLayerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [newLayerId]: blankLayer(state.currentIndexPatternId),
        },
      };
    },

    cloneLayer(state, layerId, newLayerId, getNewId) {
      return {
        ...state,
        layers: cloneLayer(state.layers, layerId, newLayerId, getNewId),
      };
    },

    removeLayer(state: IndexPatternPrivateState, layerId: string) {
      const newLayers = { ...state.layers };
      delete newLayers[layerId];

      return {
        ...state,
        layers: newLayers,
      };
    },

    clearLayer(state: IndexPatternPrivateState, layerId: string) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: blankLayer(state.currentIndexPatternId),
        },
      };
    },

    getLayers(state: IndexPatternPrivateState) {
      return Object.keys(state.layers);
    },

    removeColumn({ prevState, layerId, columnId, indexPatterns }) {
      const indexPattern = indexPatterns[prevState.layers[layerId]?.indexPatternId];
      return mergeLayer({
        state: prevState,
        layerId,
        newLayer: deleteColumn({
          layer: prevState.layers[layerId],
          columnId,
          indexPattern,
        }),
      });
    },

    initializeDimension(state, layerId, indexPatterns, { columnId, groupId, staticValue }) {
      const indexPattern = indexPatterns[state.layers[layerId]?.indexPatternId];
      if (staticValue == null) {
        return state;
      }

      return mergeLayer({
        state,
        layerId,
        newLayer: insertNewColumn({
          layer: state.layers[layerId],
          op: 'static_value',
          columnId,
          field: undefined,
          indexPattern,
          visualizationGroups: [],
          initialParams: { params: { value: staticValue } },
          targetGroup: groupId,
        }),
      });
    },

    toExpression: (state, layerId, indexPatterns) =>
      toExpression(state, layerId, indexPatterns, uiSettings),

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      const { onChangeIndexPattern, ...otherProps } = props;
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                ...core,
                data,
                dataViews,
                fieldFormats,
                charts,
                unifiedSearch,
              }}
            >
              <IndexPatternDataPanel
                data={data}
                dataViews={dataViews}
                fieldFormats={fieldFormats}
                charts={charts}
                indexPatternFieldEditor={dataViewFieldEditor}
                {...otherProps}
                core={core}
                uiActions={uiActions}
                onIndexPatternRefresh={onRefreshIndexPattern}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    uniqueLabels(state: IndexPatternPrivateState) {
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
        Object.entries(layer.columns).forEach(([columnId, column]) => {
          columnLabelMap[columnId] = makeUnique(column.label);
        });
      });

      return columnLabelMap;
    },

    isValidColumn: (state, indexPatterns, layerId, columnId) => {
      const layer = state.layers[layerId];

      return !isColumnInvalid(layer, columnId, indexPatterns[layer.indexPatternId]);
    },

    renderDimensionTrigger: (
      domElement: Element,
      props: DatasourceDimensionTriggerProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(props.state);

      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                appName: 'lens',
                storage,
                uiSettings,
                data,
                fieldFormats,
                savedObjects: core.savedObjects,
                docLinks: core.docLinks,
                unifiedSearch,
              }}
            >
              <IndexPatternDimensionTrigger
                uniqueLabel={columnLabelMap[props.columnId]}
                {...props}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderDimensionEditor: (
      domElement: Element,
      props: DatasourceDimensionEditorProps<IndexPatternPrivateState>
    ) => {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(props.state);

      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <I18nProvider>
            <KibanaContextProvider
              services={{
                appName: 'lens',
                storage,
                uiSettings,
                data,
                fieldFormats,
                savedObjects: core.savedObjects,
                docLinks: core.docLinks,
                http: core.http,
                unifiedSearch,
              }}
            >
              <IndexPatternDimensionEditor
                uiSettings={uiSettings}
                storage={storage}
                fieldFormats={fieldFormats}
                savedObjectsClient={core.savedObjects.client}
                http={core.http}
                data={data}
                unifiedSearch={unifiedSearch}
                dataViews={dataViews}
                uniqueLabel={columnLabelMap[props.columnId]}
                {...props}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    },

    renderLayerPanel: (
      domElement: Element,
      props: DatasourceLayerPanelProps<IndexPatternPrivateState>
    ) => {
      const { onChangeIndexPattern, ...otherProps } = props;
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <LayerPanel
            onChangeIndexPattern={(indexPatternId) => {
              triggerActionOnIndexPatternChange({
                indexPatternId,
                state: props.state,
                layerId: props.layerId,
                uiActions,
              });
              onChangeIndexPattern(indexPatternId, DATASOURCE_ID, props.layerId);
            }}
            {...otherProps}
          />
        </KibanaThemeProvider>,
        domElement
      );
    },

    canCloseDimensionEditor: (state) => {
      return !state.isDimensionClosePrevented;
    },

    getDropProps,
    onDrop,

    getCustomWorkspaceRenderer: (
      state: IndexPatternPrivateState,
      dragging: DraggingIdentifier,
      indexPatterns: Record<string, IndexPattern>
    ) => {
      if (dragging.field === undefined || dragging.indexPatternId === undefined) {
        return undefined;
      }

      const indexPattern = indexPatterns[dragging.indexPatternId as string];
      const draggedField = dragging as DraggingIdentifier & {
        field: IndexPatternField;
        indexPatternId: string;
      };
      const geoFieldType =
        draggedField.field.esTypes &&
        draggedField.field.esTypes.find((esType) => {
          return ['geo_point', 'geo_shape'].includes(esType);
        });
      return geoFieldType
        ? () => {
            return (
              <GeoFieldWorkspacePanel
                uiActions={uiActions}
                fieldType={geoFieldType}
                indexPattern={indexPattern}
                fieldName={draggedField.field.name}
              />
            );
          }
        : undefined;
    },

    updateCurrentIndexPatternId: ({ state, indexPatternId, setState }) => {
      setState({
        ...state,
        currentIndexPatternId: indexPatternId,
      });
    },

    onRefreshIndexPattern,
    onIndexPatternChange(state, indexPatterns, indexPatternId, layerId) {
      if (layerId) {
        return changeLayerIndexPattern({
          indexPatternId,
          layerId,
          state,
          replaceIfPossible: true,
          storage,
          indexPatterns,
        });
      }
      return changeIndexPattern({ indexPatternId, state, storage, indexPatterns });
    },
    onIndexPatternRename: (state, oldIndexPatternId, newIndexPatternId) => {
      return renameIndexPattern({ state, oldIndexPatternId, newIndexPatternId });
    },
    getRenderEventCounters(state: IndexPatternPrivateState): string[] {
      const additionalEvents = {
        time_shift: false,
        filter: false,
      };
      const operations = flatten(
        Object.values(state.layers ?? {}).map((l) =>
          Object.values(l.columns).map((c) => {
            if (c.timeShift) {
              additionalEvents.time_shift = true;
            }
            if (c.filter) {
              additionalEvents.filter = true;
            }
            return c.operationType;
          })
        )
      );

      return [
        ...operations,
        ...Object.entries(additionalEvents).reduce<string[]>((acc, [key, isActive]) => {
          if (isActive) {
            acc.push(key);
          }
          return acc;
        }, []),
      ].map((item) => `dimension_${item}`);
    },

    // Reset the temporary invalid state when closing the editor, but don't
    // update the state if it's not needed
    updateStateOnCloseDimension: ({ state, layerId }) => {
      const layer = state.layers[layerId];
      if (!Object.values(layer.incompleteColumns || {}).length) {
        return;
      }
      return mergeLayer({
        state,
        layerId,
        newLayer: { ...layer, incompleteColumns: undefined },
      });
    },

    getPublicAPI({ state, layerId, indexPatterns }: PublicAPIProps<IndexPatternPrivateState>) {
      const columnLabelMap = indexPatternDatasource.uniqueLabels(state);
      const layer = state.layers[layerId];
      const visibleColumnIds = layer.columnOrder.filter((colId) => !isReferenced(layer, colId));

      return {
        datasourceId: DATASOURCE_ID,
        getTableSpec: () => {
          // consider also referenced columns in this case
          // but map fields to the top referencing column
          const fieldsPerColumn: Record<string, string[]> = {};
          Object.keys(layer.columns).forEach((colId) => {
            const visibleColumnId = getReferenceRoot(layer, colId);
            fieldsPerColumn[visibleColumnId] = fieldsPerColumn[visibleColumnId] || [];

            const column = layer.columns[colId];
            if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
              fieldsPerColumn[visibleColumnId].push(
                ...[column.sourceField].concat(column.params.secondaryFields ?? [])
              );
            }
            if ('sourceField' in column && column.sourceField !== DOCUMENT_FIELD_NAME) {
              fieldsPerColumn[visibleColumnId].push(column.sourceField);
            }
          });
          return visibleColumnIds.map((colId, i) => ({
            columnId: colId,
            fields: [...new Set(fieldsPerColumn[colId] || [])],
          }));
        },
        getOperationForColumnId: (columnId: string) => {
          if (layer && layer.columns[columnId]) {
            if (!isReferenced(layer, columnId)) {
              return columnToOperation(
                layer.columns[columnId],
                columnLabelMap[columnId],
                indexPatterns[layer.indexPatternId]
              );
            }
          }
          return null;
        },
        getSourceId: () => {
          return layer.indexPatternId;
        },
        getFilters: (activeData: FramePublicAPI['activeData'], timeRange?: TimeRange) => {
          return getFiltersInLayer(
            layer,
            visibleColumnIds,
            activeData?.[layerId],
            indexPatterns[layer.indexPatternId],
            timeRange
          );
        },
        getVisualDefaults: () => getVisualDefaultsForLayer(layer),
        getMaxPossibleNumValues: (columnId) => {
          if (layer && layer.columns[columnId]) {
            const column = layer.columns[columnId];
            return (
              operationDefinitionMap[column.operationType].getMaxPossibleNumValues?.(column) ?? null
            );
          }
          return null;
        },
      };
    },
    getDatasourceSuggestionsForField(state, draggedField, filterLayers, indexPatterns) {
      return isDraggedField(draggedField)
        ? getDatasourceSuggestionsForField(
            state,
            draggedField.indexPatternId,
            draggedField.field,
            indexPatterns,
            filterLayers
          )
        : [];
    },
    getDatasourceSuggestionsFromCurrentState,
    getDatasourceSuggestionsForVisualizeField,
    getDatasourceSuggestionsForVisualizeCharts,

    getErrorMessages(state, indexPatterns) {
      if (!state) {
        return;
      }

      // Forward the indexpattern as well, as it is required by some operationType checks
      const layerErrors = Object.entries(state.layers)
        .filter(([_, layer]) => !!indexPatterns[layer.indexPatternId])
        .map(([layerId, layer]) =>
          (
            getErrorMessages(
              layer,
              indexPatterns[layer.indexPatternId],
              state,
              layerId,
              core,
              data
            ) ?? []
          ).map((message) => ({
            shortMessage: '', // Not displayed currently
            longMessage: typeof message === 'string' ? message : message.message,
            fixAction: typeof message === 'object' ? message.fixAction : undefined,
          }))
        );

      // Single layer case, no need to explain more
      if (layerErrors.length <= 1) {
        return layerErrors[0]?.length ? layerErrors[0] : undefined;
      }

      // For multiple layers we will prepend each error with the layer number
      const messages = layerErrors.flatMap((errors, index) => {
        return errors.map((error) => {
          const { shortMessage, longMessage } = error;
          return {
            shortMessage: shortMessage
              ? i18n.translate('xpack.lens.indexPattern.layerErrorWrapper', {
                  defaultMessage: 'Layer {position} error: {wrappedMessage}',
                  values: {
                    position: index + 1,
                    wrappedMessage: shortMessage,
                  },
                })
              : '',
            longMessage: longMessage
              ? i18n.translate('xpack.lens.indexPattern.layerErrorWrapper', {
                  defaultMessage: 'Layer {position} error: {wrappedMessage}',
                  values: {
                    position: index + 1,
                    wrappedMessage: longMessage,
                  },
                })
              : '',
          };
        });
      });
      return messages.length ? messages : undefined;
    },
    getWarningMessages: (state, frame, adapters, setState) => {
      return [
        ...(getStateTimeShiftWarningMessages(data.datatableUtilities, state, frame) || []),
        ...getPrecisionErrorWarningMessages(
          data.datatableUtilities,
          state,
          frame,
          core.docLinks,
          setState
        ),
      ];
    },
    getSearchWarningMessages: (state, warning) => {
      return [...getTSDBRollupWarningMessages(state, warning)];
    },
    getDeprecationMessages: () => {
      const deprecatedMessages: React.ReactNode[] = [];
      const useFieldExistenceSamplingKey = 'lens:useFieldExistenceSampling';
      const isUsingSampling = core.uiSettings.get(useFieldExistenceSamplingKey);

      if (isUsingSampling) {
        deprecatedMessages.push(
          <EuiCallOut
            color="warning"
            iconType="alert"
            size="s"
            title={
              <FormattedMessage
                id="xpack.lens.indexPattern.useFieldExistenceSamplingBody"
                defaultMessage="Field existence sampling has been deprecated and will be removed in Kibana {version}. You may disable this feature in {link}."
                values={{
                  version: '8.6.0',
                  link: (
                    <EuiLink
                      onClick={() => {
                        core.application.navigateToApp('management', {
                          path: `/kibana/settings?query=${useFieldExistenceSamplingKey}`,
                        });
                      }}
                    >
                      <FormattedMessage
                        id="xpack.lens.indexPattern.useFieldExistenceSampling.advancedSettings"
                        defaultMessage="Advanced Settings"
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
          />
        );
      }

      return deprecatedMessages;
    },
    checkIntegrity: (state, indexPatterns) => {
      const ids = Object.values(state.layers || {}).map(({ indexPatternId }) => indexPatternId);
      return ids.filter((id) => !indexPatterns[id]);
    },
    isTimeBased: (state, indexPatterns) => {
      if (!state) return false;
      const { layers } = state;
      return (
        Boolean(layers) &&
        Object.values(layers).some((layer) => {
          return (
            Boolean(indexPatterns[layer.indexPatternId]?.timeFieldName) ||
            layer.columnOrder
              .filter((colId) => layer.columns[colId].isBucketed)
              .some((colId) => {
                const column = layer.columns[colId];
                return (
                  isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
                  !column.params.ignoreTimeRange
                );
              })
          );
        })
      );
    },
    isEqual: (
      persistableState1: IndexPatternPersistedState,
      references1: SavedObjectReference[],
      persistableState2: IndexPatternPersistedState,
      references2: SavedObjectReference[]
    ) =>
      isEqual(
        injectReferences(persistableState1, references1),
        injectReferences(persistableState2, references2)
      ),
    getUsedDataView: (state: IndexPatternPrivateState, layerId: string) => {
      return state.layers[layerId].indexPatternId;
    },
    getUsedDataViews: (state) => {
      return Object.values(state.layers).map(({ indexPatternId }) => indexPatternId);
    },
  };

  return indexPatternDatasource;
}

function blankLayer(indexPatternId: string) {
  return {
    indexPatternId,
    columns: {},
    columnOrder: [],
  };
}
