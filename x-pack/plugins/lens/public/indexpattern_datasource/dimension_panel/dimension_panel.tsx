/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { DatasourceDimensionTriggerProps, DatasourceDimensionEditorProps } from '../../types';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { IndexPatternColumn } from '../indexpattern';
import { fieldIsInvalid } from '../utils';
import { IndexPatternPrivateState } from '../types';
import { DimensionEditor } from './dimension_editor';
import { DateRange } from '../../../common';
import { getOperationSupportMatrix } from './operation_support';

export type IndexPatternDimensionTriggerProps = DatasourceDimensionTriggerProps<
  IndexPatternPrivateState
> & {
  uniqueLabel: string;
};

export type IndexPatternDimensionEditorProps = DatasourceDimensionEditorProps<
  IndexPatternPrivateState
> & {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  layerId: string;
  http: HttpSetup;
  data: DataPublicPluginStart;
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
  const selectedColumn: IndexPatternColumn | null = layer.columns[props.columnId] || null;
  const currentIndexPattern = props.state.indexPatterns[layer.indexPatternId];

  const selectedColumnSourceField =
    selectedColumn && 'sourceField' in selectedColumn ? selectedColumn.sourceField : undefined;
  const currentFieldIsInvalid = useMemo(
    () =>
      fieldIsInvalid(selectedColumnSourceField, selectedColumn?.operationType, currentIndexPattern),
    [selectedColumnSourceField, selectedColumn?.operationType, currentIndexPattern]
  );

  const { columnId, uniqueLabel } = props;
  if (!selectedColumn) {
    return null;
  }
  const formattedLabel = wrapOnDot(uniqueLabel);

  const triggerLinkA11yText = i18n.translate('xpack.lens.configure.editConfig', {
    defaultMessage: 'Click to edit configuration or drag to move',
  });

  if (currentFieldIsInvalid) {
    return (
      <EuiToolTip
        content={
          <p>
            {i18n.translate('xpack.lens.configure.invalidConfigTooltip', {
              defaultMessage: 'Invalid configuration.',
            })}
            <br />
            {i18n.translate('xpack.lens.configure.invalidConfigTooltipClick', {
              defaultMessage: 'Click for more details.',
            })}
          </p>
        }
        anchorClassName="eui-displayBlock"
      >
        <EuiLink
          color="danger"
          id={columnId}
          className="lnsLayerPanel__triggerLink"
          onClick={props.onClick}
          data-test-subj="lns-dimensionTrigger"
          aria-label={triggerLinkA11yText}
          title={triggerLinkA11yText}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon size="s" type="alert" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{selectedColumn.label}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiToolTip>
    );
  }

  return (
    <EuiLink
      id={columnId}
      className="lnsLayerPanel__triggerLink"
      onClick={props.onClick}
      data-test-subj="lns-dimensionTrigger"
      aria-label={triggerLinkA11yText}
      title={triggerLinkA11yText}
    >
      {formattedLabel}
    </EuiLink>
  );
};

export const IndexPatternDimensionEditorComponent = function IndexPatternDimensionPanel(
  props: IndexPatternDimensionEditorProps
) {
  const layerId = props.layerId;
  const currentIndexPattern =
    props.state.indexPatterns[props.state.layers[layerId]?.indexPatternId];
  const operationSupportMatrix = getOperationSupportMatrix(props);

  const selectedColumn: IndexPatternColumn | null =
    props.state.layers[layerId].columns[props.columnId] || null;

  return (
    <DimensionEditor
      {...props}
      currentIndexPattern={currentIndexPattern}
      selectedColumn={selectedColumn}
      operationSupportMatrix={operationSupportMatrix}
    />
  );
};

export const IndexPatternDimensionTrigger = memo(IndexPatternDimensionTriggerComponent);
export const IndexPatternDimensionEditor = memo(IndexPatternDimensionEditorComponent);
