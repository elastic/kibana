/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ConsoleProps } from '..';

export type ConsoleHeaderProps = Pick<ConsoleProps, 'TitleComponent'>;

export const ConsoleHeader = memo<ConsoleHeaderProps>(({ TitleComponent }) => {
  const helpOnCLickHandler = useCallback(() => {
    //
  }, []);

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow>{TitleComponent ? <TitleComponent /> : ''}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon onClick={helpOnCLickHandler} iconType={'help'} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
ConsoleHeader.displayName = 'ConsoleHeader';
