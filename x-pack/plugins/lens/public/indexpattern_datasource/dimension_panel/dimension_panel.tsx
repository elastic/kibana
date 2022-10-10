/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatasourceDimensionTriggerProps, DatasourceDimensionEditorProps } from '../../types';
import type { GenericIndexPatternColumn } from '../indexpattern';
import { isColumnInvalid } from '../utils';
import type { IndexPatternPrivateState } from '../types';
import { DimensionEditor } from './dimension_editor';
import type { DateRange } from '../../../common';
import { getOperationSupportMatrix } from './operation_support';
import { DimensionTrigger } from '../../shared_components/dimension_trigger';

export type IndexPatternDimensionTriggerProps =
  DatasourceDimensionTriggerProps<IndexPatternPrivateState> & {
    uniqueLabel: string;
  };

export type IndexPatternDimensionEditorProps =
  DatasourceDimensionEditorProps<IndexPatternPrivateState> & {
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
    savedObjectsClient: SavedObjectsClientContract;
    layerId: string;
    http: HttpSetup;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    uniqueLabel: string;
    dateRange: DateRange;
  };

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

export const IndexPatternDimensionTriggerComponent = function IndexPatternDimensionTrigger(
  props: IndexPatternDimensionTriggerProps
) {
  const layerId = props.layerId;
  const layer = props.state.layers[layerId];
  const currentIndexPattern = props.indexPatterns[layer.indexPatternId];
  const { columnId, uniqueLabel, invalid, invalidMessage, hideTooltip } = props;

  const currentColumnHasErrors = useMemo(
    () => invalid || isColumnInvalid(layer, columnId, currentIndexPattern),
    [layer, columnId, currentIndexPattern, invalid]
  );

  const selectedColumn: GenericIndexPatternColumn | null = layer.columns[props.columnId] ?? null;

  if (!selectedColumn) {
    return null;
  }
  const formattedLabel = wrapOnDot(uniqueLabel);

  return (
    <DimensionTrigger
      id={columnId}
      label={!currentColumnHasErrors ? formattedLabel : selectedColumn.label}
      isInvalid={Boolean(currentColumnHasErrors)}
      hideTooltip={hideTooltip}
      invalidMessage={invalidMessage}
    />
  );
};

export const IndexPatternDimensionEditorComponent = function IndexPatternDimensionPanel(
  props: IndexPatternDimensionEditorProps
) {
  const layerId = props.layerId;
  const currentIndexPattern = props.indexPatterns[props.state.layers[layerId]?.indexPatternId];
  if (!currentIndexPattern) {
    return null;
  }
  const operationSupportMatrix = getOperationSupportMatrix(props);

  const selectedColumn: GenericIndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;
  return (
    <DimensionEditor
      {...props}
      layerType={props.layerType || LayerTypes.DATA}
      currentIndexPattern={currentIndexPattern}
      selectedColumn={selectedColumn}
      operationSupportMatrix={operationSupportMatrix}
    />
  );
};

export const IndexPatternDimensionTrigger = memo(IndexPatternDimensionTriggerComponent);
export const IndexPatternDimensionEditor = memo(IndexPatternDimensionEditorComponent);
