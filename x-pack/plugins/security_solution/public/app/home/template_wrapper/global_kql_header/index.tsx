/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { OutPortal } from 'react-reverse-portal';
import {
  GLOBAL_HEADER_HEIGHT,
  GLOBAL_HEADER_HEIGHT_WITH_GLOBAL_BANNER,
} from '../../../../../common/constants';
import { useGlobalHeaderPortal } from '../../../../common/hooks/use_global_header_portal';

const StyledStickyWrapper = styled.div`
  position: sticky;
  z-index: ${(props) => props.theme.eui.euiZLevel2};
  top: ${GLOBAL_HEADER_HEIGHT}px;

  .kbnBody--chromeHidden & {
    top: 0;
  }
  // header, banner
  .kbnBody--hasHeaderBanner & {
    top: ${GLOBAL_HEADER_HEIGHT_WITH_GLOBAL_BANNER}px;
  }
  // no header, banner
  .kbnBody--chromeHidden.kbnBody--hasHeaderBanner & {
    top: ${(props) => props.theme.eui.euiSizeXL}; // $kbnHeaderBannerHeight
  }
`;

export const GlobalKQLHeader = React.memo(() => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <StyledStickyWrapper>
      <OutPortal node={globalKQLHeaderPortalNode} />
    </StyledStickyWrapper>
  );
});

GlobalKQLHeader.displayName = 'GlobalKQLHeader';
