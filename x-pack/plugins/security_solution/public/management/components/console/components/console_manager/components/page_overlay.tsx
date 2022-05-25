/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import styled from 'styled-components';
import { EuiPortal } from '@elastic/eui';
import classnames from 'classnames';

const OverlayRootContainer = styled.div`
  border: none;

  display: block;
  position: fixed;

  top: 96px;
  bottom: 0;
  right: 0;

  height: calc(100% - 96px);
  width: 100%;

  z-index: ${({ theme: { eui } }) => eui.euiZFlyout};

  background-color: ${({ theme: { eui } }) => eui.euiColorEmptyShade};

  &.hidden {
    display: none;
  }
`;

export interface PageOverlayProps {
  children: ReactNode;
  isHidden?: boolean;
  enableScrolling?: boolean;
  lockDocumentBody?: boolean; // FIXME:PT implement
  hideOnUrlPathnameChange?: boolean; // FIXME:PT implement
  onHide?: () => void; // FIXME:PT implement
  'data-test-subj'?: string;
}

/**
 * A generic component for taking over the entire Kibana UI main content area (everything below the
 * top header that includes the breadcrumbs)
 */
export const PageOverlay = memo<PageOverlayProps>(
  ({ enableScrolling = false, isHidden = false, children, 'data-test-subj': dataTestSubj }) => {
    const containerClassName = useMemo(() => {
      return classnames({
        'eui-scrollBar': enableScrolling,
        hidden: isHidden,
      });
    }, [enableScrolling, isHidden]);

    return (
      <EuiPortal>
        <OverlayRootContainer data-test-subj={dataTestSubj} className={containerClassName}>
          {children}
        </OverlayRootContainer>
      </EuiPortal>
    );
  }
);
PageOverlay.displayName = 'PageOverlay';
