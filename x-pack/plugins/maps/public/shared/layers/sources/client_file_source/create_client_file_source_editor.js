/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import { FileUploadAndParse } from '../../../../../../file_upload/public/';

export function ClientFileCreateSourceEditor({ previewGeojsonFile }) {
  return (
    <FileUploadAndParse previewFile={previewGeojsonFile}/>
  );
}
