/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import { JsonUploadAndParse } from '../../../../../../file_upload/public/';
import { defaultSettings } from './default_index_settings';

export function ClientFileCreateSourceEditor({ previewGeojsonFile, boolIndexData = false,
  viewIndexedData }) {
  return (
    <JsonUploadAndParse
      previewCallback={previewGeojsonFile}
      boolIndexData={boolIndexData}
      indexingDetails={defaultSettings}
      postProcessing={x => x}
      onIndexSuccess={viewIndexedData}
      // onIndexError={}
    />
  );
}
