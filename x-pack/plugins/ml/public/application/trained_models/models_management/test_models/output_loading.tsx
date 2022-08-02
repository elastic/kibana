/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import { LineRange } from '@elastic/eui/src/components/loading/loading_content';

export const OutputLoadingContent: FC<{ text: string }> = ({ text }) => {
  const actualLines = text.split(/\r\n|\r|\n/).length + 1;
  const lines = actualLines > 4 && actualLines <= 10 ? actualLines : 4;

  return <EuiLoadingContent lines={lines as LineRange} />;
};
