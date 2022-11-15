/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, CSSProperties } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { EuiFocusTrap, EuiPortal } from '@elastic/eui';
import classnames from 'classnames';
import { useLocation } from 'react-router-dom';
import type { EuiPortalProps } from '@elastic/eui/src/components/portal/portal';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { useHasFullScreenContent } from '../../../common/containers/use_full_screen';
import {
  FULL_SCREEN_CONTENT_OVERRIDES_CSS_STYLESHEET,
  TIMELINE_OVERRIDES_CSS_STYLESHEET,
} from '../../../common/components/page';
import {
  SELECTOR_TIMELINE_IS_VISIBLE_CSS_CLASS_NAME,
  TIMELINE_EUI_THEME_ZINDEX_LEVEL,
} from '../../../timelines/components/timeline/styles';

const OverlayRootContainer = styled.div`
  border: none;

  display: block;
  position: fixed;
  overflow: hidden;

  top: calc((${({ theme: { eui } }) => eui.euiHeaderHeightCompensation} * 2));
  bottom: 0;
  right: 0;

  height: calc(100% - ${({ theme: { eui } }) => eui.euiHeaderHeightCompensation} * 2);
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
    padding: ${({ theme: { eui } }) => eui.euiSizeXS};
  }
  &.padding-s {
    padding: ${({ theme: { eui } }) => eui.euiSizeS};
  }
  &.padding-m {
    padding: ${({ theme: { eui } }) => eui.euiSizeM};
  }
  &.padding-l {
    padding: ${({ theme: { eui } }) => eui.euiSizeL};
  }
  &.padding-xl {
    padding: ${({ theme: { eui } }) => eui.euiSizeXL};
  }

  &.fullScreen {
    top: 0;
    height: 100%;
  }

  .fullHeight {
    height: 100%;
  }
`;

const PAGE_OVERLAY_CSS_CLASSNAME = 'securitySolution-pageOverlay';
export const PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME = `${PAGE_OVERLAY_CSS_CLASSNAME}-isVisible`;
export const PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME = `${PAGE_OVERLAY_CSS_CLASSNAME}-lock`;
export const PAGE_OVERLAY_DOCUMENT_BODY_FULLSCREEN_CLASSNAME = `${PAGE_OVERLAY_CSS_CLASSNAME}-fullScreen`;

const PageOverlayGlobalStyles = createGlobalStyle<{ theme: EuiTheme }>`
  body.${PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME} {
    overflow: hidden;
  }

  //-------------------------------------------------------------------------------------------
  // Style overrides for when Page Overlay is in full screen mode
  //-------------------------------------------------------------------------------------------
  // Needs to override some position of EUI components to ensure they are displayed correctly
  // when the top Kibana header is not visible
  //-------------------------------------------------------------------------------------------
  body.${PAGE_OVERLAY_DOCUMENT_BODY_FULLSCREEN_CLASSNAME} {
    ${FULL_SCREEN_CONTENT_OVERRIDES_CSS_STYLESHEET}
  }

  //-------------------------------------------------------------------------------------------
  // TIMELINE SPECIFIC STYLES
  //-------------------------------------------------------------------------------------------
  // The timeline overlay uses a custom z-index, which causes issues with any other content that
  // is normally appended to the 'document.body' directly (like popups, masks, flyouts, etc).
  // The styles below will be applied anytime the timeline is opened/visible and attempts to
  // mitigate the issues around z-index so that content that is shown after the PageOverlay is
  // opened is displayed properly.
  //-------------------------------------------------------------------------------------------
  body.${SELECTOR_TIMELINE_IS_VISIBLE_CSS_CLASS_NAME}.${PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME} {
    .${PAGE_OVERLAY_CSS_CLASSNAME},
    .euiOverlayMask,
    .euiFlyout {
      z-index: ${({ theme: { eui } }) => eui[TIMELINE_EUI_THEME_ZINDEX_LEVEL]};
    }

    // Other Timeline overrides from AppGlobalStyle:
    // x-pack/plugins/security_solution/public/common/components/page/index.tsx
    ${TIMELINE_OVERRIDES_CSS_STYLESHEET}
  }
`;

const setDocumentBodyOverlayIsVisible = () => {
  document.body.classList.add(PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME);
};

const unSetDocumentBodyOverlayIsVisible = () => {
  document.body.classList.remove(PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME);
};

const setDocumentBodyLock = () => {
  document.body.classList.add(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME);
};

const unSetDocumentBodyLock = () => {
  document.body.classList.remove(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME);
};

const setDocumentBodyFullScreen = () => {
  document.body.classList.add(PAGE_OVERLAY_DOCUMENT_BODY_FULLSCREEN_CLASSNAME);
};

const unSetDocumentBodyFullScreen = () => {
  document.body.classList.remove(PAGE_OVERLAY_DOCUMENT_BODY_FULLSCREEN_CLASSNAME);
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
   * Setting this to `true` (default) will enable scrolling inside of the overlay
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
 * top header that includes the breadcrumbs). This component adds nothing more than a blank page - its up
 * to the `children` pass to actually display any type of intractable UI for the user.
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
    const showInFullScreen = useHasFullScreenContent();
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
        [PAGE_OVERLAY_CSS_CLASSNAME]: true,
        scrolling: enableScrolling,
        hidden: isHidden,
        fullScreen: showInFullScreen,
        'eui-scrollBar': enableScrolling,
        'padding-xs': paddingSize === 'xs',
        'padding-s': paddingSize === 's',
        'padding-m': paddingSize === 'm',
        'padding-l': paddingSize === 'l',
        'padding-xl': paddingSize === 'xl',
      });
    }, [enableScrolling, isHidden, paddingSize, showInFullScreen]);

    // Capture the URL `pathname` that the overlay was opened for
    useEffect(() => {
      if (isMounted()) {
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

          return prevState;
        });
      }
    }, [appendAsBodyLastNode, isHidden, isMounted, pathname]);

    // If `hideOnUrlPathNameChange` is true, then determine if the pathname changed and if so, call `onHide()`
    useEffect(() => {
      if (
        isMounted() &&
        onHide &&
        hideOnUrlPathnameChange &&
        !isHidden &&
        openedOnPathName &&
        openedOnPathName !== pathname
      ) {
        onHide();
      }
    }, [hideOnUrlPathnameChange, isHidden, isMounted, onHide, openedOnPathName, pathname]);

    // Handle adding class names to the `document.body` DOM element
    useEffect(() => {
      if (isMounted()) {
        if (isHidden) {
          unSetDocumentBodyOverlayIsVisible();
          unSetDocumentBodyLock();
          unSetDocumentBodyFullScreen();
        } else {
          setDocumentBodyOverlayIsVisible();

          if (lockDocumentBody) {
            setDocumentBodyLock();
          }

          if (showInFullScreen) {
            setDocumentBodyFullScreen();
          }
        }
      }

      return () => {
        unSetDocumentBodyLock();
        unSetDocumentBodyOverlayIsVisible();
        unSetDocumentBodyFullScreen();
      };
    }, [isHidden, isMounted, lockDocumentBody, showInFullScreen]);

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
