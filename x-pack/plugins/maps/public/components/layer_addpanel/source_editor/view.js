/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ALL_SOURCES } from '../../../shared/layers/sources/all_sources';
import { GeojsonFileSource } from '../../../shared/layers/sources/client_file_source';
import {
  EuiSpacer,
  EuiPanel,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const SourceEditor = ({
  isImport, clearSource, sourceType, indexingTriggered, ...props
}) => {
  const editorProperties = getEditorProperties({ isImport, indexingTriggered, ...props });
  let editor;
  if(isImport) {
    editor = GeojsonFileSource.renderEditor(editorProperties);
  } else {
    const Source = ALL_SOURCES.find(Source => {
      return Source.type === sourceType;
    });
    if (!Source) {
      throw new Error(`Unexpected source type: ${sourceType}`);
    }
    editor = Source.renderEditor(editorProperties);
  }
  return (
    <Fragment>
      {
        indexingTriggered
          ? null
          : (
            <Fragment>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                onClick={clearSource}
                iconType="arrowLeft"
              >
                <FormattedMessage
                  id="xpack.maps.addLayerPanel.changeDataSourceButtonLabel"
                  defaultMessage="Change data source"
                />
              </EuiButtonEmpty>
              <EuiSpacer size="s" />
            </Fragment>
          )
      }
      <EuiPanel>
        {editor}
      </EuiPanel>
    </Fragment>
  );
};

function getEditorProperties({
  inspectorAdapters, isImport, onRemove, previewLayer,
  addImportLayer, indexingTriggered, onIndexReady, onIndexSuccess
}) {
  return {
    onPreviewSource: previewLayer,
    inspectorAdapters,
    ...(isImport
      ? {
        onRemove,
        boolIndexData: indexingTriggered,
        addAndViewSource: source => addImportLayer(source),
        onIndexReadyStatusChange: onIndexReady,
        onIndexSuccess,
      }
      : {})
  };
}
