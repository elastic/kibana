/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/** @jsx jsx */
import { jsx, css } from '@emotion/react';
import React from 'react';

/**
 * Applies CSS styling to enable text to be truncated with an ellipsis.
 * Example: "Don't leave me hanging..."
 *
 * Note: Requires a parent container with a defined width or max-width.
 */
const styles = css`
  &,
  & * {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: top;
    white-space: nowrap;
  }
`;

export const TruncatableText: React.FC = ({ children }) => <span css={styles}>{children}</span>;
