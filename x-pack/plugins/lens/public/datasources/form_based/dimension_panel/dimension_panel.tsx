/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DatasourceDimensionTriggerProps, DatasourceDimensionEditorProps } from '../../../types';
import { GenericIndexPatternColumn } from '../form_based';
import { FormBasedPrivateState } from '../types';
import { DimensionEditor } from './dimension_editor';
import { DateRange } from '../../../../common';
import { getOperationSupportMatrix } from './operation_support';

export type FormBasedDimensionTriggerProps =
  DatasourceDimensionTriggerProps<FormBasedPrivateState> & {
    uniqueLabel: string;
  };

export type FormBasedDimensionEditorProps =
  DatasourceDimensionEditorProps<FormBasedPrivateState> & {
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

export const FormBasedDimensionEditorComponent = function FormBasedDimensionPanel(
  props: FormBasedDimensionEditorProps
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

export const FormBasedDimensionEditor = memo(FormBasedDimensionEditorComponent);
