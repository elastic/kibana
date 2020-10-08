/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingContent } from '@elastic/eui';
import React from 'react';

export const LogEntryExampleMessagesLoadingIndicator: React.FunctionComponent<{
  exampleCount: number;
}> = ({ exampleCount }) => (
  <>
    {Array.from(new Array(exampleCount), (_value, index) => (
      <EuiLoadingContent key={index} lines={1} />
    ))}
  </>
);
