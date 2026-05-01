/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

const IS_DEV_MODE = process.env.NODE_ENV !== 'production';

const placeholderOutlineCss = css`
  outline: 2px dashed red;
  outline-offset: -2px;
`;

export interface DevModePlaceholderProps {
  children: React.ReactNode;
  hasPlaceholderData?: boolean;
}

/**
 * Wraps children with a dotted red outline when in dev mode AND the component
 * is using placeholder/hardcoded data. Remove this wrapper once real data is wired up.
 */
export function DevModePlaceholder({
  children,
  hasPlaceholderData = true,
}: DevModePlaceholderProps) {
  if (!IS_DEV_MODE || !hasPlaceholderData) {
    return <>{children}</>;
  }

  return <div css={placeholderOutlineCss}>{children}</div>;
}
