/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiCodeBlock, EuiPanel } from '@elastic/eui';

interface Props {
  processors: object[];
}

export const ConfirmationPanel: FC<Props> = ({ processors }) => {
  return (
    <EuiPanel color="subdued" borderRadius="none">
      <EuiCodeBlock language="json" overflowHeight={300} isCopyable>
        {'`' + JSON.stringify(processors, null, 2) + '`'}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
