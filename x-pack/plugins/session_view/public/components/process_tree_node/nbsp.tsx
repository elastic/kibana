/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CSSObject } from '@emotion/react';

const css: CSSObject = {
  width: '6px',
  display: 'inline-block',
};

// Renders a non-breaking space with a specific width.
export const Nbsp = () => {
  return <span css={css}>&nbsp;</span>;
};
