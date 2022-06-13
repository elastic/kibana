/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactElement, useCallback } from 'react';
import { EuiPopover } from '@elastic/eui';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputShowPopover } from '../../../hooks/state_selectors/use_with_input_show_popover';

export interface InputAreaPopoverProps {
  children: ReactElement;
}

export const InputAreaPopover = memo<InputAreaPopoverProps>(({ children }) => {
  const isPopoverOpen = useWithInputShowPopover() !== undefined;
  const dispatch = useConsoleStateDispatch();

  const handlePopoverOnClose = useCallback(() => {
    dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
  }, [dispatch]);

  return (
    <EuiPopover
      button={children}
      closePopover={handlePopoverOnClose}
      isOpen={isPopoverOpen}
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
