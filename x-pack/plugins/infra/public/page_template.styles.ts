/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

// This is added `EuiPageSection.contentProps` to facilitate a full height layout whereby the
// inner container will set its own height and be scrollable.
export const fullHeightContentStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  width: 100%;
  height: 100%;
`;
