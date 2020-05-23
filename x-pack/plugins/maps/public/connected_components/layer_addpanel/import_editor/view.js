/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';

import { uploadLayerWizardConfig } from '../../../layers/sources/client_file_source';

export const ImportEditor = props => {
  const editorProperties = getEditorProperties(props);
  return (
    <EuiPanel style={{ position: 'relative' }}>
      {uploadLayerWizardConfig.renderWizard(editorProperties)}
    </EuiPanel>
  );
};

function getEditorProperties({
  previewLayer,
  mapColors,
  onRemove,
  isIndexingTriggered,
  onIndexReady,
  importSuccessHandler,
  importErrorHandler,
}) {
  return {
    previewLayer,
    mapColors,
    onRemove,
    importSuccessHandler,
    importErrorHandler,
    isIndexingTriggered,
    onIndexReady,
  };
}
