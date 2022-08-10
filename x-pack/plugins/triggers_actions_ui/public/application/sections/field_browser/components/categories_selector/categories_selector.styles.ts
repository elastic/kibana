/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';

export const styles = {
  countBadge: css`
    margin-left: 5px;
  `,
  categoryName: ({ bold }: { bold: boolean }) => css`
    font-weight: ${bold ? 'bold' : 'normal'};
  `,
  selectableContainer: css`
    width: 300px;
  `,
};
