/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Sticky } from 'react-sticky';
import { pure } from 'recompose';
import styled from 'styled-components';

import { SuperDatePicker } from '../super_date_picker';

const offsetChrome = 49;
const gutterTimeline = '70px'; // Temporary until timeline is moved - MichaelMarcialis

const Aside = styled.aside<{ isSticky?: boolean }>`
  background: ${({ theme }) =>
    theme.darkMode ? euiDarkVars.euiColorEmptyShade : euiLightVars.euiColorEmptyShade};
  border-bottom: ${({ theme }) =>
    theme.darkMode ? euiDarkVars.euiBorderThin : euiLightVars.euiBorderThin};
  box-sizing: content-box;
  margin: 0 -${gutterTimeline} 0 -${euiLightVars.euiSizeL};
  padding: ${euiLightVars.euiSize} ${gutterTimeline} ${euiLightVars.euiSize}
    ${euiLightVars.euiSizeL};

  ${props =>
    props.isSticky &&
    `
      top: ${offsetChrome}px !important;
      z-index: ${euiLightVars.euiZNavigation};
    `}
`;

export interface FiltersGlobalProps {
  children?: React.ReactNode;
}

export const FiltersGlobal = pure<FiltersGlobalProps>(({ children }) => (
  <Sticky topOffset={-offsetChrome}>
    {({ style, isSticky }) => (
      <Aside isSticky={isSticky} style={style}>
        <EuiFlexGroup>
          {children && <EuiFlexItem>{children}</EuiFlexItem>}

          <EuiFlexItem grow={false}>
            <SuperDatePicker id="global" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Aside>
    )}
  </Sticky>
));
