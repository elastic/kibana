/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';

import React, { useState } from 'react';

import type { EuiAccordionProps } from '@elastic/eui';
import { EuiAccordion } from '@elastic/eui';

/**
 * does not render children before it is opened
 * once children rendered for the first time, they won't re-rerendered on subsequent accordion toggling
 */
const OptimizedAccordionComponent: FC<EuiAccordionProps> = ({ children, ...props }) => {
  const [trigger, setTrigger] = useState<'closed' | 'open'>('closed');
  const [isRendered, setIsRendered] = useState<boolean>(false);

  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    if (isOpen) {
      setIsRendered(true);
    }
    setTrigger(newState);
  };

  return (
    <EuiAccordion {...props} forceState={trigger} onToggle={onToggle}>
      {isRendered ? children : null}
    </EuiAccordion>
  );
};

export const OptimizedAccordion = React.memo(OptimizedAccordionComponent);
OptimizedAccordion.displayName = 'OptimizedAccordion';
