/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const container: CSSObject = {
    padding: '12px 24px',
  };

  return {
    container,
  };
};
