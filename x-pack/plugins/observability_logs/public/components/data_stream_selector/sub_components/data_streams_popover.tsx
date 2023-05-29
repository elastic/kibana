/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiPopoverProps,
  EuiTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { DATA_VIEW_POPOVER_CONTENT_WIDTH, POPOVER_ID, selectDatasetLabel } from '../constants';
import { getPopoverButtonStyles } from '../utils';

const panelStyle = { width: DATA_VIEW_POPOVER_CONTENT_WIDTH };
interface DataStreamsPopoverProps extends Omit<EuiPopoverProps, 'button'> {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}

export const DataStreamsPopover = ({
  children,
  onClick,
  title,
  ...props
}: DataStreamsPopoverProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const buttonStyles = getPopoverButtonStyles({ fullWidth: isMobile });

  return (
    <EuiPopover
      id={POPOVER_ID}
      button={
        <EuiButton
          css={buttonStyles}
          iconType="arrowDown"
          iconSide="right"
          onClick={onClick}
          fullWidth={isMobile}
        >
          {title}
        </EuiButton>
      }
      panelPaddingSize="none"
      buffer={8}
      {...(isMobile && { display: 'block' })}
      {...props}
    >
      <EuiPanel paddingSize="none" hasShadow={false} css={panelStyle}>
        <Title size="xxs">
          <span>{selectDatasetLabel}</span>
        </Title>
        <EuiHorizontalRule margin="none" />
        {children}
      </EuiPanel>
    </EuiPopover>
  );
};

const Title = styled(EuiTitle)`
  padding: 12px;
  display: block;
`;
