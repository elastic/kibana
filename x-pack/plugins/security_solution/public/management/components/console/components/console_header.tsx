/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ConsoleProps } from '..';

export type ConsoleHeaderProps = Pick<ConsoleProps, 'TitleComponent'>;

export const ConsoleHeader = memo<ConsoleHeaderProps>(({ TitleComponent }) => {
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow>{TitleComponent ? <TitleComponent /> : ''}</EuiFlexItem>
      {/* TODO: Implement actions (probably via OLM issue #3829) */}
      <EuiFlexItem grow={false}>{''}</EuiFlexItem>
    </EuiFlexGroup>
  );
});
ConsoleHeader.displayName = 'ConsoleHeader';
