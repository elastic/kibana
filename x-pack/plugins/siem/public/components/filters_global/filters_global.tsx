/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Sticky } from 'react-sticky';
import { pure } from 'recompose';
import styled from 'styled-components';

import { SuperDatePicker } from '../super_date_picker';

const offsetChrome = 49;
const gutterTimeline = '70px'; // Temporary until timeline is moved - MichaelMarcialis

const disableSticky = 'screen and (max-width: ' + euiLightVars.euiBreakpoints.s + ')';
const disableStickyMq = window.matchMedia(disableSticky);

const Aside = styled.aside<{ isSticky?: boolean }>`
  ${props => `
    background: ${props.theme.eui.euiColorEmptyShade};
    border-bottom: ${props.theme.eui.euiBorderThin};
    box-sizing: content-box;
    margin: 0 -${gutterTimeline} 0 -${props.theme.eui.euiSizeL};
    padding: ${props.theme.eui.euiSize} ${gutterTimeline} ${props.theme.eui.euiSize} ${
    props.theme.eui.euiSizeL
  };

    ${props.isSticky &&
      `
      top: ${offsetChrome}px !important;
      z-index: ${props.theme.eui.euiZNavigation};
    `}

    @media only ${disableSticky} {
      position: static !important;
      z-index: ${props.theme.eui.euiZContent} !important;
    }
  `}
`;

// Temporary fix for EuiSuperDatePicker whitespace bug and auto width - Michael Marcialis
const FlexItemWithDatePickerFix = styled(EuiFlexItem)`
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;

export interface FiltersGlobalProps {
  children: React.ReactNode;
}

export const FiltersGlobal = pure<FiltersGlobalProps>(({ children }) => (
  <Sticky disableCompensation={disableStickyMq.matches} topOffset={-offsetChrome}>
    {({ style, isSticky }) => (
      <Aside isSticky={isSticky} style={style}>
        <EuiFlexGroup>
          <EuiFlexItem grow={8}>{children}</EuiFlexItem>

          <FlexItemWithDatePickerFix grow={4}>
            <SuperDatePicker id="global" />
          </FlexItemWithDatePickerFix>
        </EuiFlexGroup>
      </Aside>
    )}
  </Sticky>
));
