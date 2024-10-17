/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

export const groupCountCss = css`
  font-weight: ${euiThemeVars.euiFontWeightSemiBold};
  border-right: ${euiThemeVars.euiBorderThin};
  margin-right: ${euiThemeVars.euiSize};
  padding-right: ${euiThemeVars.euiSize};
`;

export const groupingContainerCss = css`
  .inventoryGroupAccordion .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: ${euiThemeVars.euiSizeS};
    margin-right: ${euiThemeVars.euiSizeS};
    border-left: ${euiThemeVars.euiBorderThin};
    border-right: ${euiThemeVars.euiBorderThin};
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-radius: 0 0 ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius};
  }
  .inventoryGroupAccordion .euiAccordion__triggerWrapper {
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-left: ${euiThemeVars.euiBorderThin};
    border-right: ${euiThemeVars.euiBorderThin};
    border-radius: ${euiThemeVars.euiBorderRadius};
    min-height: 78px;
    padding-left: ${euiThemeVars.euiSize};
    padding-right: ${euiThemeVars.euiSize};
  }
  .inventoryGroupAccordion {
    border-top: ${euiThemeVars.euiBorderThin};
    border-bottom: none;
    border-radius: ${euiThemeVars.euiBorderRadius};
  }
  .inventoryGroupPanel {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding-right: ${euiThemeVars.euiSizeXL};
  }
  .inventoryPanelBadge {
    font-weight: ${euiThemeVars.euiFontWeightBold};
    margin-right: ${euiThemeVars.euiSizeS};
  }
`;
