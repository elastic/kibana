/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { InPortal } from 'react-reverse-portal';

import { useGlobalHeaderPortal } from '../../hooks/use_global_header_portal';

const Wrapper = styled.aside`
  position: relative;
  z-index: ${({ theme }) => theme.eui.euiZNavigation};
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  padding: ${({ theme }) => theme.eui.paddingSizes.m} ${({ theme }) => theme.eui.paddingSizes.l};
`;
Wrapper.displayName = 'Wrapper';

const FiltersGlobalContainer = styled.header<{ show: boolean }>`
  display: ${({ show }) => (show ? 'block' : 'none')};
`;

FiltersGlobalContainer.displayName = 'FiltersGlobalContainer';

export interface FiltersGlobalProps {
  children: React.ReactNode;
  show?: boolean;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(({ children, show = true }) => {
  const { globalHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <InPortal node={globalHeaderPortalNode}>
      <FiltersGlobalContainer data-test-subj="filters-global-container" show={show}>
        <Wrapper className="siemFiltersGlobal">{children}</Wrapper>
      </FiltersGlobalContainer>
    </InPortal>
  );
});

FiltersGlobal.displayName = 'FiltersGlobal';
