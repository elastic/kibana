/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useEffect, useMemo, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { EuiPortal } from '@elastic/eui';
import classnames from 'classnames';
import { useLocation } from 'react-router-dom';
import { useIsMounted } from '../../../../hooks/use_is_mounted';

const OverlayRootContainer = styled.div`
  border: none;

  display: block;
  position: fixed;
  overflow: hidden;

  top: 96px; // FIXME:PT calculate from eui theme vars
  bottom: 0;
  right: 0;

  height: calc(100% - 96px); // FIXME:PT calculate from eui theme vars
  width: 100%;

  z-index: ${({ theme: { eui } }) => eui.euiZFlyout};

  background-color: ${({ theme: { eui } }) => eui.euiColorEmptyShade};

  &.scrolling {
    overflow: auto;
  }

  &.hidden {
    display: none;
  }
`;

const PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME = 'securitySolution-page-overlay-lock';

const PageOverlayGlobalStyles = createGlobalStyle`
  body.${PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME} {
    overflow: hidden;
  }
`;

const setDocumentBodyLock = () => {
  document.body.classList.add(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME);
};

const unSetDocumentBodyLock = () => {
  document.body.classList.remove(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME);
};

export interface PageOverlayProps {
  children: ReactNode;
  /** If the overlay should be hidden. NOTE: it will remain rendered/mounted, but `display: none` */
  isHidden?: boolean;
  /**
   * By default, the
   */
  enableScrolling?: boolean;
  lockDocumentBody?: boolean;
  hideOnUrlPathnameChange?: boolean;
  onHide?: () => void;
  'data-test-subj'?: string;
}

/**
 * A generic component for taking over the entire Kibana UI main content area (everything below the
 * top header that includes the breadcrumbs)
 */
export const PageOverlay = memo<PageOverlayProps>(
  ({
    enableScrolling = false,
    isHidden = false,
    onHide,
    hideOnUrlPathnameChange,
    lockDocumentBody,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const { pathname } = useLocation();
    const isMounted = useIsMounted();
    const [openedOnPathName, setOpenedOnPathName] = useState<null | string>(null);

    const containerClassName = useMemo(() => {
      return classnames({
        'eui-scrollBar': enableScrolling,
        scrolling: enableScrolling,
        hidden: isHidden,
      });
    }, [enableScrolling, isHidden]);

    // Capture the URL `pathname` that the overlay was opened for
    useEffect(() => {
      if (isMounted) {
        setOpenedOnPathName((prevState) => {
          if (isHidden) {
            return null;
          } else {
            if (!prevState) {
              return pathname;
            }
          }

          return pathname;
        });
      }
    }, [isHidden, isMounted, pathname]);

    useEffect(() => {
      if (
        isMounted &&
        onHide &&
        hideOnUrlPathnameChange &&
        !isHidden &&
        openedOnPathName &&
        openedOnPathName !== pathname
      ) {
        onHide();
      }
    }, [hideOnUrlPathnameChange, isHidden, isMounted, onHide, openedOnPathName, pathname]);

    useEffect(() => {
      if (isMounted) {
        if (isHidden) {
          unSetDocumentBodyLock();
        } else {
          setDocumentBodyLock();
        }
      }

      return () => unSetDocumentBodyLock();
    }, [isHidden, isMounted]);

    return (
      <EuiPortal>
        <OverlayRootContainer data-test-subj={dataTestSubj} className={containerClassName}>
          {children}
        </OverlayRootContainer>
        <PageOverlayGlobalStyles />
      </EuiPortal>
    );
  }
);
PageOverlay.displayName = 'PageOverlay';
