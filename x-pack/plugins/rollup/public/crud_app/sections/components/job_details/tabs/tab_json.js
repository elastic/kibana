/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeEditor } from '../../../../../shared_imports';

export const TabJson = ({ json }) => {
  const jsonString = JSON.stringify(json, null, 2);

  return (
    <EuiCodeEditor
      mode="json"
      theme="textmate"
      isReadOnly
      setOptions={{ maxLines: Infinity, useWorker: false }}
      value={jsonString}
      editorProps={{
        $blockScrolling: Infinity,
      }}
    />
  );
};
