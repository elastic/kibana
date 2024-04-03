/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPopover, EuiIcon } from '@elastic/eui';
import { useBoolean } from '../../../../../hooks/use_boolean';

export const Popover = ({ children }: { children: React.ReactNode }) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const onButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover();
    },
    [togglePopover]
  );

  return (
    <EuiPopover
      panelPaddingSize="s"
      button={
        <button onClick={onButtonClick} data-test-subj="hostsViewTableColumnPopoverButton">
          <EuiIcon type="questionInCircle" />
        </button>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      offset={10}
      anchorPosition="upCenter"
      panelStyle={{ maxWidth: 350 }}
    >
      {children}
    </EuiPopover>
  );
};
