/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/react-kibana-context-styled';
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
