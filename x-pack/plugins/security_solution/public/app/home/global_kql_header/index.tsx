/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { OutPortal } from 'react-reverse-portal';
import { useGlobalHeaderPortal } from '../../../common/hooks/use_global_header_portal';

/**
 * This component uses a reverse portal to render the global kql bar within the SecuritySolutionPageWrapper
 */
const Wrapper = styled.header<{ $isFixed: boolean }>`
  ${({ theme, $isFixed }) => `
    background: ${theme.eui.euiPageBackgroundColor};
    border-bottom: ${theme.eui.euiBorderThin};
    z-index: ${theme.eui.euiZNavigation};
    position: relative;
    ${
      $isFixed
        ? `
          position: fixed;
          right: 0;
          width: 100%;
        `
        : ''
    }
  `}
`;
Wrapper.displayName = 'Wrapper';

interface GlobalKQLHeaderProps {
  isFixed?: boolean;
}

export const GlobalKQLHeader = React.memo(
  forwardRef<HTMLDivElement, GlobalKQLHeaderProps>(({ isFixed = true }, ref) => {
    const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();
    return (
      <Wrapper ref={ref} $isFixed={isFixed}>
        <OutPortal node={globalKQLHeaderPortalNode} />
      </Wrapper>
    );
  })
);
GlobalKQLHeader.displayName = 'GlobalKQLHeader';
