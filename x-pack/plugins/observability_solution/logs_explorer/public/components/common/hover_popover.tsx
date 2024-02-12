/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiPopover, EuiPopoverTitle } from '@elastic/eui';

export const HoverPopover = ({
  children,
  button,
  title,
}: {
  children: React.ReactChild;
  button: React.ReactElement;
  title: string;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
    }
  };

  const onMouseEnter = () => {
    clearTimer();
    setIsPopoverOpen(true);
  };

  const onMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setIsPopoverOpen(false), 100);
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="s"
        ownFocus={false}
      >
        <EuiPopoverTitle>{title}</EuiPopoverTitle>
        {children}
      </EuiPopover>
    </div>
  );
};
