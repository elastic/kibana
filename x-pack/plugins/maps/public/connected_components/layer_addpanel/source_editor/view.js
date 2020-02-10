/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ALL_SOURCES } from '../../../layers/sources/all_sources';
import { EuiSpacer, EuiPanel, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const SourceEditor = ({
  clearSource,
  sourceType,
  isIndexingTriggered,
  inspectorAdapters,
  previewLayer,
}) => {
  const editorProperties = {
    onPreviewSource: previewLayer,
    inspectorAdapters,
  };
  const Source = ALL_SOURCES.find(Source => {
    return Source.type === sourceType;
  });
  if (!Source) {
    throw new Error(`Unexpected source type: ${sourceType}`);
  }
  const editor = Source.renderEditor(editorProperties);
  return (
    <Fragment>
      {isIndexingTriggered ? null : (
        <Fragment>
          <EuiButtonEmpty size="xs" flush="left" onClick={clearSource} iconType="arrowLeft">
            <FormattedMessage
              id="xpack.maps.addLayerPanel.changeDataSourceButtonLabel"
              defaultMessage="Change data source"
            />
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
        </Fragment>
      )}
      <EuiPanel>{editor}</EuiPanel>
    </Fragment>
  );
};
