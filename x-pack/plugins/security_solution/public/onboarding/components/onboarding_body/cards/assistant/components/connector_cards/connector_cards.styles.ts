/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useConnectorCardsStyles = () => {
  const { euiTheme } = useEuiTheme();

  return css`
    .connectorSelectorPanel {
      height: 160px;
      &.euiPanel:hover {
        background-color: ${euiTheme.colors.lightestShade};
      }
    }
  `;
};
