/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactElement } from 'react';
import { EuiPopover } from '@elastic/eui';

export interface InputAreaPopoverProps {
  children: ReactElement;
}

export const InputAreaPopover = memo<InputAreaPopoverProps>(({ children }) => {
  return (
    <EuiPopover
      button={children}
      closePopover={() => {}}
      isOpen={true}
      anchorPosition="upLeft"
      hasArrow={false}
      display="block"
      attachToAnchor={true}
    >
      <div>{'InputAreaPopover placeholder'}</div>
    </EuiPopover>
  );
});
InputAreaPopover.displayName = 'InputAreaPopover';
