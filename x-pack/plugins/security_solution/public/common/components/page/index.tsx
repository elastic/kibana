/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDescriptionList, EuiFlexGroup, EuiIcon } from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';

import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../common/constants';

export const SecuritySolutionAppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
`;
SecuritySolutionAppWrapper.displayName = 'SecuritySolutionAppWrapper';

/*
  SIDE EFFECT: the following `createGlobalStyle` overrides default styling in angular code that was not theme-friendly
  and `EuiPopover`, `EuiToolTip` global styles
*/
export const AppGlobalStyle = createGlobalStyle<{ theme: { eui: { euiColorPrimary: string } } }>`
  .euiPopover__panel.euiPopover__panel-isOpen {
    z-index: 9900 !important;
    min-width: 24px;
  }
  .euiPopover__panel.euiPopover__panel-isOpen.sourcererPopoverPanel {
    // needs to appear under modal
    z-index: 5900 !important;
  }
  .euiToolTip {
    z-index: 9950 !important;
  }

  .euiDataGridRowCell .euiDataGridRowCell__expandActions .euiDataGridRowCell__actionButtonIcon {
    display: none;

    &:first-child,
    &:nth-child(2),
    &:nth-child(3),
    &:last-child {
      display: inline-flex;
    }

  }

  /*
    overrides the default styling of EuiDataGrid expand popover footer to
    make it a column of actions instead of the default actions row
  */

  .euiDataGridRowCell__popover {

    max-width: 815px !important;
    max-height: none !important;
    overflow: hidden;


    .expandable-top-value-button {
      &.euiButtonEmpty--primary:enabled:focus,
      .euiButtonEmpty--primary:focus {
        background-color: transparent;
      }
    }


    &.euiPopover__panel.euiPopover__panel-isOpen {
      padding: 8px 0;
      min-width: 65px;
    }


    .euiPopoverFooter {
      border: 0;
      margin-top: 0 !important;
      .euiFlexGroup {
        flex-direction: column;
      }
    }

    // Hide EUI's 'Filter in' and 'Filter out' footer buttons - replaced with our own buttons
    .euiPopoverFooter:nth-child(2) {
      .euiFlexItem:first-child,
      .euiFlexItem:nth-child(2) {
          display: none;
      }
    }
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

  /* hide open draggable popovers when a modal is being displayed to prevent them from covering the modal */
  body.euiBody-hasOverlayMask {
    .euiDataGridRowCell__popover.euiPopover__panel-isOpen,
    .withHoverActions__popover.euiPopover__panel-isOpen {
      visibility: hidden !important;
    }
  }


  /* ensure elastic charts tooltips appear above open euiPopovers */
  .echTooltip {
    z-index: 9950;
  }

  /* applies a "toggled" button style to the Full Screen button */
  .${FULL_SCREEN_TOGGLED_CLASS_NAME} {
    ${({ theme }) => `background-color: ${theme.eui.euiColorPrimary} !important`};
  }

  /*
     EuiScreenReaderOnly has a default 1px height and width. These extra pixels
     were adding additional height to every table row in the alerts table on the
     Detections page. As a result of this extra height, the Detections page was
     displaying unnecessary scroll bars and unnecessary empty space bellow the
     alerts table. Thus, we set the height and width of all EuiScreenReaderOnly
     to zero.
  */
  .euiScreenReaderOnly {
    clip: rect(1px, 1px, 1px, 1px);
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
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

export const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

CountBadge.displayName = 'CountBadge';

export const Spacer = styled.span`
  margin-left: 5px;
`;

Spacer.displayName = 'Spacer';

export const Badge = styled(EuiBadge)`
  vertical-align: top;
` as unknown as typeof EuiBadge;

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
