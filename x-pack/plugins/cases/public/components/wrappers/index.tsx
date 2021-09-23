/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';

export const WhitePageWrapper = styled.div`
  background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  flex: 1 1 auto;
`;

export const SectionWrapper = styled.div`
  box-sizing: content-box;
  margin: 0 auto;
  max-width: 1175px;
  width: 100%;
`;

export const HeaderWrapper = styled.div`
  ${({ theme }) =>
    `
      padding: ${theme.eui.paddingSizes.l} ${theme.eui.paddingSizes.l} 0 ${theme.eui.paddingSizes.l};
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.s}) {
        padding: ${theme.eui.paddingSizes.s} ${theme.eui.paddingSizes.s} 0
          ${theme.eui.paddingSizes.s};
      }
    `};
`;
const gutterTimeline = '70px'; // seems to be a timeline reference from the original file
export const ContentWrapper = styled.div`
  ${({ theme }) =>
    `
      padding: ${theme.eui.paddingSizes.l} ${theme.eui.paddingSizes.l} ${gutterTimeline} ${theme.eui.paddingSizes.l};
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.s}) {
        padding: ${theme.eui.paddingSizes.s} ${theme.eui.paddingSizes.s} ${gutterTimeline}
          ${theme.eui.paddingSizes.s};
      }
    `};
`;
