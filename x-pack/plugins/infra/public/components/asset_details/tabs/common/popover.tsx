/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiIcon, IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useBoolean } from '../../../../hooks/use_boolean';

export const Popover = ({
  children,
  icon,
  ...props
}: {
  children: React.ReactNode;
  icon: IconType;
  'data-test-subj'?: string;
}) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  return (
    <EuiPopover
      panelPaddingSize="s"
      button={
        <EuiIcon
          data-test-subj={props['data-test-subj']}
          type={icon}
          onClick={togglePopover}
          css={css`
            cursor: pointer;
          `}
        />
      }
      isOpen={isPopoverOpen}
      offset={10}
      closePopover={closePopover}
      repositionOnScroll
      anchorPosition="upCenter"
    >
      {children}
    </EuiPopover>
  );
};
