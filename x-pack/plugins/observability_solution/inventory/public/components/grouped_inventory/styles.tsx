/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/react-kibana-context-styled';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiContextMenu } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

export const StyledContextMenu = euiStyled(EuiContextMenu)`
  width: 250px;
  & .euiContextMenuItem__text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .euiContextMenuItem {
    border-bottom: ${euiThemeVars.euiBorderThin};
  }
  .euiContextMenuItem:last-child {
    border: none;
  }
`;

export const StyledEuiButtonEmpty = euiStyled(EuiButtonEmpty)`
  font-weight: 'normal';

  .euiButtonEmpty__text {
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const groupCountCss = css`
  font-weight: ${euiThemeVars.euiFontWeightSemiBold};
  border-right: ${euiThemeVars.euiBorderThin};
  margin-right: 16px;
  padding-right: 16px;
`;

export const groupingContainerCss = css`
  .inventoryGroupAccordion .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: 8px;
    margin-right: 8px;
    border-left: ${euiThemeVars.euiBorderThin};
    border-right: ${euiThemeVars.euiBorderThin};
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-radius: 0 0 6px 6px;
  }
  .inventoryGroupAccordion .euiAccordion__triggerWrapper {
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-left: ${euiThemeVars.euiBorderThin};
    border-right: ${euiThemeVars.euiBorderThin};
    border-radius: 6px;
    min-height: 78px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .inventoryGroupAccordion {
    border-top: ${euiThemeVars.euiBorderThin};
    border-bottom: none;
    border-radius: 6px;
  }
  .inventoryGroupPanel {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding-right: 32px;
  }
  .inventoryPanelBadge {
    font-weight: ${euiThemeVars.euiFontWeightBold};
    margin-right: 6px;
  }
`;
