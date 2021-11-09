/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { OutPortal } from 'react-reverse-portal';
import { useGlobalHeaderPortal } from '../../../../common/hooks/use_global_header_portal';

const StyledStickyWrapper = styled.div`
  position: sticky;
  z-index: ${(props) => props.theme.eui.euiZHeaderBelowDataGrid};
  // TOP location is declared in src/public/rendering/_base.scss to keep in line with Kibana Chrome
`;

export const GlobalKQLHeader = React.memo(() => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <StyledStickyWrapper id="securitySolutionStickyKQL">
      <OutPortal node={globalKQLHeaderPortalNode} />
    </StyledStickyWrapper>
  );
});

GlobalKQLHeader.displayName = 'GlobalKQLHeader';
