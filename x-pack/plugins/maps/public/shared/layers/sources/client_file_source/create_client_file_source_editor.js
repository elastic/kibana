/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import { JsonUploadAndParse } from '../../../../../../file_upload/public';

export function ClientFileCreateSourceEditor({
  previewGeojsonFile,
  boolIndexData = false,
  onIndexingComplete,
  onRemove,
  onIndexReadyStatusChange,
}) {
  return (
    <JsonUploadAndParse
      appName={'Maps'}
      boolIndexData={boolIndexData}
      onFileUpload={previewGeojsonFile}
      onFileRemove={onRemove}
      onIndexReadyStatusChange={onIndexReadyStatusChange}
      transformDetails={'geo'}
      onIndexingComplete={onIndexingComplete}
    />
  );
}
