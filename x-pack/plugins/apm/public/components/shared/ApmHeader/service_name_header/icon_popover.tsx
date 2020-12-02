/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon } from '@elastic/eui';
import { EuiButtonEmpty, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { useState } from 'react';

interface IconPopoverProps {
  icon: string;
  title: string;
  children: React.ReactChild;
}
export function IconPopover({ icon, title, children }: IconPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tooglePopover = () => {
    setIsOpen((prevState) => !prevState);
  };

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty onClick={tooglePopover}>
          <EuiIcon type={icon} size="l" color="black" />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={tooglePopover}
    >
      <EuiPopoverTitle>{title}</EuiPopoverTitle>
      {children}
    </EuiPopover>
  );
}
