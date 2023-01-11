/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiTitle, transparentize } from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';

const EUI_HEADER_HEIGHT = '93px';
const PANEL_LEFT_OFFSET = '249px';
const PANEL_WIDTH = '340px';

export const panelClass = 'solutionGroupedNavPanel';

/**
 * We need to target the body to check the header banner class which is a parent element
 * of the portal panel. A global style is needed.
 * (This rule should be moved to the Kibana core rendering styles if this navigation becomes generic)
 */
export const GlobalPanelStyle = createGlobalStyle<{ theme: { eui: { euiSizeXL: string } } }>`
  body.kbnBody--hasHeaderBanner .${panelClass} {
    top: calc(${EUI_HEADER_HEIGHT} + ${({ theme }) => theme.eui.euiSizeXL});
  }
`;

export const EuiPanelStyled = styled(EuiPanel)<{ $bottomOffset?: string }>`
  position: fixed;
  top: ${EUI_HEADER_HEIGHT};
  left: ${PANEL_LEFT_OFFSET};
  bottom: 0;
  width: ${PANEL_WIDTH};
  height: inherit;

  // If the bottom bar is visible add padding to the navigation
  ${({ $bottomOffset, theme }) =>
    $bottomOffset != null &&
    `
      height: inherit;
      bottom: ${$bottomOffset};
      box-shadow:
        // left
        -${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS} -${theme.eui.euiSizeS} rgb(0 0 0 / 15%),
        // right
        ${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS} -${theme.eui.euiSizeS} rgb(0 0 0 / 15%),
        // bottom inset to match timeline bar top shadow
        inset 0 -6px ${theme.eui.euiSizeXS} -${theme.eui.euiSizeXS} rgb(0 0 0 / 15%);
      `}

  .solutionGroupedNavPanelLink {
    .solutionGroupedNavPanelLinkItem {
      background-color: transparent; /* originally white, it prevents panel to remove the bottom inset box shadow */
      &:hover {
        background-color: ${({ theme }) => transparentize(theme.eui.euiColorPrimary, 0.1)};
      }
      dt {
        color: ${({ theme }) => theme.eui.euiColorPrimaryText};
      }
      dd {
        color: ${({ theme }) => theme.eui.euiColorDarkestShade};
      }
    }
  }
`;

export const EuiTitleStyled = styled(EuiTitle)<{ $paddingTop?: boolean }>`
  padding-left: ${({ theme }) => theme.eui.euiSizeS};
  ${({ $paddingTop = false, theme }) => $paddingTop && `padding-top: ${theme.eui.euiSizeS};`};
`;
