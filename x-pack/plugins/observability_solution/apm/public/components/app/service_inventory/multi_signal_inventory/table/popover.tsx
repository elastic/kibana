/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiIcon, type IconColor, type IconSize } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useBoolean } from '@kbn/react-hooks';

export function Popover({
  children,
  iconColor,
  iconSize,
  ...props
}: {
  children: React.ReactNode;
  iconColor?: IconColor;
  iconSize?: IconSize;
  'data-test-subj'?: string;
}) {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  return (
    <EuiPopover
      panelPaddingSize="s"
      focusTrapProps={{
        returnFocus: false,
      }}
      button={
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePopover();
          }}
          css={css`
            display: flex;
          `}
          data-test-subj={props['data-test-subj']}
        >
          <EuiIcon type="questionInCircle" size={iconSize ?? 'original'} />
        </button>
      }
      isOpen={isPopoverOpen}
      offset={10}
      closePopover={closePopover}
      repositionOnScroll
      anchorPosition="upCenter"
      panelStyle={{ maxWidth: 350 }}
    >
      {children}
    </EuiPopover>
  );
}
