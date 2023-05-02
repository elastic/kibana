/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { UseEuiTheme, euiScrollBarStyles } from '@elastic/eui';

export const phrasesValuesComboboxCss = (theme: UseEuiTheme) => css`
  .euiComboBox__inputWrap {
    ${euiScrollBarStyles(theme)}

    overflow: auto;
    max-height: 100px;
  }
`;
