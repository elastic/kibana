/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const Empty: React.FC = () => {
  return (
    <EuiEmptyPrompt
      iconType="tag"
      title={<h1>Find resources by tag</h1>}
      body={
        <>
          <p>Select tags on the left to find attached resources</p>
        </>
      }
    />
  );
};
