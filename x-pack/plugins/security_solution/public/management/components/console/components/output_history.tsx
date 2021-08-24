/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { CommonProps, EuiFlexGroup } from '@elastic/eui';

// const OutputHistoryContainer = styled(EuiFlexGroup)`
//   height: 100%;
// `;

export type OutputHistoryProps = CommonProps & PropsWithChildren<{}>;

export const OutputHistory = memo<OutputHistoryProps>(({ children, className }) => {
  return (
    <EuiFlexGroup
      className={className}
      wrap={true}
      direction="row"
      alignItems="flexEnd"
      responsive={false}
    >
      {children}
    </EuiFlexGroup>
  );
});

OutputHistory.displayName = 'OutputHistory';
