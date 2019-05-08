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

export const SourceEditor = ({ isImport, clearSource, sourceType, ...props }) => {
  const editorProperties = getEditorProperties({ isImport, ...props });
  if(isImport) {
    return (
      <EuiPanel>
        {GeojsonFileSource.renderEditor(editorProperties)}
      </EuiPanel>
    );
  } else {
    const Source = ALL_SOURCES.find(Source => {
      return Source.type === sourceType;
    });
    if (!Source) {
      throw new Error(`Unexpected source type: ${sourceType}`);
    }
    return (
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
        <EuiPanel>
          {Source.renderEditor(editorProperties)}
        </EuiPanel>
      </Fragment>
    );
  }
};

function getEditorProperties({
  removeTransientLayer, inspectorAdapters, isImport, previewLayer,
  addImportLayer, indexingTriggered, onIndexReady, onIndexSuccess
}) {
  return {
    onPreviewSource: previewLayer,
    inspectorAdapters,
    ...(isImport
      ? {
        boolIndexData: indexingTriggered,
        addAndViewSource: source => addImportLayer(source),
        onRemove: removeTransientLayer,
        onIndexReadyStatusChange: onIndexReady,
        onIndexSuccess,
      }
      : {})
  };
}
