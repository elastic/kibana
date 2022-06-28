/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';

export const styles = {
  tableContainer: ({ height, theme }: { height: number; theme: EuiTheme }) => css`
    margin-top: ${theme.eui.euiSizeXS};
    border-top: ${theme.eui.euiBorderThin};
    height: ${height}px;
    overflow: hidden;
  `,
};
