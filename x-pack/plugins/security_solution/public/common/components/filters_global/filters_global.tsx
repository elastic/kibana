/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { InPortal } from 'react-reverse-portal';
import { EuiPanel } from '@elastic/eui';

import { useGlobalHeaderPortal } from '../../hooks/use_global_header_portal';
import { GLOBAL_HEADER_HEIGHT } from '../../../../common/constants';

const FiltersGlobalContainer = styled.header<{ show: boolean }>`
  display: ${({ show }) => (show ? 'block' : 'none')};
`;

FiltersGlobalContainer.displayName = 'FiltersGlobalContainer';

const StyledEuiPanel = styled(EuiPanel)`
  position: sticky;
  z-index: ${({ theme }) => theme.eui.euiZLevel2};
  top: ${GLOBAL_HEADER_HEIGHT}px; // The height of the fixed kibana global header (search row + breadcrumbsRow)
`;

export interface FiltersGlobalProps {
  children: React.ReactNode;
  show?: boolean;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(({ children, show = true }) => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <InPortal node={globalKQLHeaderPortalNode}>
      <StyledEuiPanel borderRadius="none" color="subdued" paddingSize="s">
        <FiltersGlobalContainer data-test-subj="filters-global-container" show={show}>
          {children}
        </FiltersGlobalContainer>
      </StyledEuiPanel>
    </InPortal>
  );
});

FiltersGlobal.displayName = 'FiltersGlobal';
