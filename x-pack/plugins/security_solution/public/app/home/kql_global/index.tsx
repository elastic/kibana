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

const Wrapper = styled.header<{ $isFixed: boolean }>`
  ${({ theme, $isFixed }) => `
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    z-index: ${theme.eui.euiZNavigation};
    position: relative;
    ${
      $isFixed
        ? `
    left: 240px;
    position: fixed;
    right: 0;
    width: calc(100% - 240px);
    `
        : ''
    }
  `}
`;
Wrapper.displayName = 'Wrapper';

interface KQLHeaderGlobalProps {
  isFixed?: boolean;
}

export const KQLHeaderGlobal = React.memo(
  forwardRef<HTMLDivElement, KQLHeaderGlobalProps>(({ isFixed = true }, ref) => {
    const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();
    return (
      <Wrapper ref={ref} $isFixed={isFixed}>
        <OutPortal node={globalKQLHeaderPortalNode} />
      </Wrapper>
    );
  })
);
KQLHeaderGlobal.displayName = 'KQLHeaderGlobal';
