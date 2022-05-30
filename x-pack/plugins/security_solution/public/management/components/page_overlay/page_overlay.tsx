/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
} from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { EuiFocusTrap, EuiPortal } from '@elastic/eui';
import classnames from 'classnames';
import { useLocation } from 'react-router-dom';
import { EuiPortalProps } from '@elastic/eui/src/components/portal/portal';
import { useIsMounted } from '../../hooks/use_is_mounted';

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

  &.padding-xs {
    padding: ${({ theme: { eui } }) => eui.paddingSizes.xs};
  }
  &.padding-s {
    padding: ${({ theme: { eui } }) => eui.paddingSizes.s};
  }
  &.padding-m {
    padding: ${({ theme: { eui } }) => eui.paddingSizes.m};
  }
  &.padding-l {
    padding: ${({ theme: { eui } }) => eui.paddingSizesl};
  }
  &.padding-xl {
    padding: ${({ theme: { eui } }) => eui.paddingSizes.xl};
  }

  .fullHeight {
    height: 100%;
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

  /**
   * Callback for when the user leaves the overlay
   */
  onHide: () => void;

  /** If the overlay should be hidden. NOTE: it will remain rendered/mounted, but `display: none` */
  isHidden?: boolean;

  /**
   * Setting this to `true` (defualt) will enable scrolling inside of the overlay
   */
  enableScrolling?: boolean;

  /**
   * When set to `true` (default), the browser's scroll bar will be "locked" (`overflow: hidden`),
   * so that the only scroll bar visible (possibly) is the one inside of the overlay
   */
  lockDocumentBody?: boolean;

  /**
   * If `true` (default), then the page's URL `pathname` will be tracked when the overlay is shown, and if
   * the pathname changes, the `onHide()` prop will be called.
   */
  hideOnUrlPathnameChange?: boolean;

  /**
   * Optional padding size around the overlay
   */
  paddingSize?: 'xs' | 's' | 'm' | 'l' | 'xl';

  /**
   * If set to `true` (default), whenever the page overlay is displayed (either mounted or when
   * `isHidden` goes form `false` to `true`), it will be moved so that  it is the last child of
   * inside of the `<body>`. This happens only when the page overlay is displayed
   * (ie. it does NOT attempt to track nodes added/removed from `<body>` in order to ensure
   * it is always the last one).
   */
  appendAsBodyLastNode?: boolean;

  /**
   * Explicitly set the overlay's z-index. Use with caution.
   */
  zIndex?: CSSProperties['zIndex'];

  'data-test-subj'?: string;
}

/**
 * A generic component for taking over the entire Kibana UI main content area (everything below the
 * top header that includes the breadcrumbs).
 */
export const PageOverlay = memo<PageOverlayProps>(
  ({
    children,
    onHide,
    isHidden = false,
    enableScrolling = true,
    hideOnUrlPathnameChange = true,
    lockDocumentBody = true,
    appendAsBodyLastNode = true,
    paddingSize,
    zIndex,
    'data-test-subj': dataTestSubj,
  }) => {
    const { pathname } = useLocation();
    const isMounted = useIsMounted();
    const [openedOnPathName, setOpenedOnPathName] = useState<null | string>(null);
    const portalEleRef = useRef<Node>();

    const setPortalEleRef: EuiPortalProps['portalRef'] = useCallback((node) => {
      portalEleRef.current = node;
    }, []);

    const containerCssOverrides = useMemo<CSSProperties>(() => {
      const css: CSSProperties = {};

      if (zIndex) {
        css.zIndex = zIndex;
      }

      return css;
    }, [zIndex]);

    const containerClassName = useMemo(() => {
      return classnames({
        'eui-scrollBar': enableScrolling,
        scrolling: enableScrolling,
        hidden: isHidden,
        'padding-xs': paddingSize === 'xs',
        'padding-s': paddingSize === 's',
        'padding-m': paddingSize === 'm',
        'padding-l': paddingSize === 'l',
        'padding-xl': paddingSize === 'xl',
      });
    }, [enableScrolling, isHidden, paddingSize]);

    // Capture the URL `pathname` that the overlay was opened for
    useEffect(() => {
      if (isMounted) {
        setOpenedOnPathName((prevState) => {
          if (isHidden) {
            return null;
          } else {
            // capture pathname if not yet set (first show)
            if (!prevState) {
              // append the portal to the end of `<body>`?
              if (appendAsBodyLastNode && portalEleRef.current) {
                document.body.appendChild(portalEleRef.current);
              }

              return pathname;
            }
          }

          return pathname;
        });
      }
    }, [appendAsBodyLastNode, isHidden, isMounted, pathname]);

    // If `hideOnUrlPathNameChange` is true, then determine if the pathname changed and if so, call `onHide()`
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

    // Handle locking the document.body scrolling
    useEffect(() => {
      if (isMounted) {
        if (isHidden) {
          unSetDocumentBodyLock();
        } else if (lockDocumentBody) {
          setDocumentBodyLock();
        }
      }

      return () => unSetDocumentBodyLock();
    }, [isHidden, isMounted, lockDocumentBody]);

    return (
      <EuiPortal portalRef={setPortalEleRef}>
        <OverlayRootContainer
          data-test-subj={dataTestSubj}
          className={containerClassName}
          style={containerCssOverrides}
        >
          <EuiFocusTrap data-test-subj="trap-focus" className="fullHeight">
            {children}
          </EuiFocusTrap>
        </OverlayRootContainer>
        <PageOverlayGlobalStyles />
      </EuiPortal>
    );
  }
);
PageOverlay.displayName = 'PageOverlay';
