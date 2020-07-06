/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiDescriptionList, EuiFlexGroup, EuiIcon, EuiPage } from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';

/*
  SIDE EFFECT: the following `createGlobalStyle` overrides default styling in angular code that was not theme-friendly
  and `EuiPopover`, `EuiToolTip` global styles
*/
export const AppGlobalStyle = createGlobalStyle`
  /* dirty hack to fix draggables with tooltip on FF */
  body#siem-app {
    position: static;
  }
  /* end of dirty hack to fix draggables with tooltip on FF */

  div.app-wrapper {
    background-color: rgba(0,0,0,0);
  }

  div.application {
    background-color: rgba(0,0,0,0);
  }

  .euiPopover__panel.euiPopover__panel-isOpen {
    z-index: 9900 !important;
    min-width: 24px;
  }
  .euiToolTip {
    z-index: 9950 !important;
  }

  /*
    overrides the default styling of euiComboBoxOptionsList because it's implemented
    as a popover, so it's not selectable as a child of the styled component
  */
  .euiComboBoxOptionsList {
    z-index: 9999;
  }

  /* overrides default styling in angular code that was not theme-friendly */
  .euiPanel-loading-hide-border {
    border: none;
  }

  /* hide open popovers when a modal is being displayed to prevent them from covering the modal */
  body.euiBody-hasOverlayMask .euiPopover__panel-isOpen {
    visibility: hidden !important;
  }

  /* ensure elastic charts tooltips appear above open euiPopovers */
  .echTooltip {
    z-index: 9950;
  }

`;

export const DescriptionListStyled = styled(EuiDescriptionList)`
  ${({ theme }) => `
    dt {
      font-size: ${theme.eui.euiFontSizeXS} !important;
    }
    dd {
      width: fit-content;
    }
    dd > div {
      width: fit-content;
    }
  `}
`;

DescriptionListStyled.displayName = 'DescriptionListStyled';

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  height: 100%;
  padding: 1rem;
  overflow: hidden;
  margin: 0px;
`;

PageContainer.displayName = 'PageContainer';

export const PageContent = styled.div`
  flex: 1 1 auto;
  height: 100%;
  position: relative;
  overflow-y: hidden;
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  margin-top: 62px;
`;

PageContent.displayName = 'PageContent';

export const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;

FlexPage.displayName = 'FlexPage';

export const PageHeader = styled.div`
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  display: flex;
  user-select: none;
  padding: 1rem 1rem 0rem 1rem;
  width: 100vw;
  position: fixed;
`;

PageHeader.displayName = 'PageHeader';

export const FooterContainer = styled.div`
  flex: 0;
  bottom: 0;
  color: #666;
  left: 0;
  position: fixed;
  text-align: left;
  user-select: none;
  width: 100%;
  background-color: #f5f7fa;
  padding: 16px;
  border-top: 1px solid #d3dae6;
`;

FooterContainer.displayName = 'FooterContainer';

export const PaneScrollContainer = styled.div`
  height: 100%;
  overflow-y: scroll;
  > div:last-child {
    margin-bottom: 3rem;
  }
`;

PaneScrollContainer.displayName = 'PaneScrollContainer';

export const Pane = styled.div`
  height: 100%;
  overflow: hidden;
  user-select: none;
`;

Pane.displayName = 'Pane';

export const PaneHeader = styled.div`
  display: flex;
`;

PaneHeader.displayName = 'PaneHeader';

export const Pane1FlexContent = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 100%;
`;

Pane1FlexContent.displayName = 'Pane1FlexContent';

export const CountBadge = (styled(EuiBadge)`
  margin-left: 5px;
` as unknown) as typeof EuiBadge;

CountBadge.displayName = 'CountBadge';

export const Spacer = styled.span`
  margin-left: 5px;
`;

Spacer.displayName = 'Spacer';

export const Badge = (styled(EuiBadge)`
  vertical-align: top;
` as unknown) as typeof EuiBadge;

Badge.displayName = 'Badge';

export const MoreRowItems = styled(EuiIcon)`
  margin-left: 5px;
`;

MoreRowItems.displayName = 'MoreRowItems';

export const OverviewWrapper = styled(EuiFlexGroup)`
  position: relative;

  .euiButtonIcon {
    position: absolute;
    right: ${(props) => props.theme.eui.euiSizeM};
    top: 6px;
    z-index: 2;
  }
`;

OverviewWrapper.displayName = 'OverviewWrapper';
