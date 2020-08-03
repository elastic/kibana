/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Sticky } from 'react-sticky';
import styled, { css } from 'styled-components';

import { FILTERS_GLOBAL_HEIGHT } from '../../../../common/constants';
import { gutterTimeline } from '../../lib/helpers';

const offsetChrome = 49;

const disableSticky = `screen and (max-width: ${euiLightVars.euiBreakpoints.s})`;
const disableStickyMq = window.matchMedia(disableSticky);

const Wrapper = styled.aside<{ isSticky?: boolean }>`
  height: ${FILTERS_GLOBAL_HEIGHT}px;
  position: relative;
  z-index: ${({ theme }) => theme.eui.euiZNavigation};
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  padding: ${({ theme }) => theme.eui.paddingSizes.m} ${gutterTimeline} ${({ theme }) =>
  theme.eui.paddingSizes.m} ${({ theme }) => theme.eui.paddingSizes.l};

  ${({ isSticky }) =>
    isSticky &&
    css`
      top: ${offsetChrome}px !important;
    `}

  @media only ${disableSticky} {
    position: static !important;
    z-index: ${({ theme }) => theme.eui.euiZContent} !important;
  }
`;
Wrapper.displayName = 'Wrapper';

const FiltersGlobalContainer = styled.header<{ show: boolean }>`
  ${({ show }) => css`
    ${show ? '' : 'display: none;'};
  `}
`;

FiltersGlobalContainer.displayName = 'FiltersGlobalContainer';

const NO_STYLE: React.CSSProperties = {};

export interface FiltersGlobalProps {
  children: React.ReactNode;
  globalFullScreen: boolean;
  show?: boolean;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(
  ({ children, globalFullScreen, show = true }) =>
    globalFullScreen ? (
      <FiltersGlobalContainer data-test-subj="non-sticky-global-container" show={show}>
        <Wrapper className="siemFiltersGlobal" isSticky={false} style={NO_STYLE}>
          {children}
        </Wrapper>
      </FiltersGlobalContainer>
    ) : (
      <Sticky disableCompensation={disableStickyMq.matches} topOffset={-offsetChrome}>
        {({ style, isSticky }) => (
          <FiltersGlobalContainer data-test-subj="sticky-filters-global-container" show={show}>
            <Wrapper className="siemFiltersGlobal" isSticky={isSticky} style={style}>
              {children}
            </Wrapper>
          </FiltersGlobalContainer>
        )}
      </Sticky>
    )
);

FiltersGlobal.displayName = 'FiltersGlobal';
