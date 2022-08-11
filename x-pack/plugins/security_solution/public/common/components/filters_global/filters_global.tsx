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

const FiltersGlobalContainer = styled.header<{ show: boolean }>`
  display: ${({ show }) => (show ? 'block' : 'none')};
`;

FiltersGlobalContainer.displayName = 'FiltersGlobalContainer';

export interface FiltersGlobalProps {
  children: React.ReactNode;
  show?: boolean;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(({ children, show = true }) => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <InPortal node={globalKQLHeaderPortalNode}>
      <EuiPanel borderRadius="none" color="subdued" paddingSize="none">
        <FiltersGlobalContainer data-test-subj="filters-global-container" show={show}>
          {children}
        </FiltersGlobalContainer>
      </EuiPanel>
    </InPortal>
  );
});

FiltersGlobal.displayName = 'FiltersGlobal';
