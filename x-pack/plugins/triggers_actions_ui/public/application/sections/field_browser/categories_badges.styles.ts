/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';

export const styles = {
  badgesGroup: ({ theme }: { theme: EuiTheme }) => css`
    margin-top: ${theme.eui.euiSizeXS};
    min-height: 24px;
  `,
};
