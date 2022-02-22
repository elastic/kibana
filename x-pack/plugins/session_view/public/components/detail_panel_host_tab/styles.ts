/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const cached = useMemo(() => {
    const description: CSSObject = {
      width: 'calc(100% - 28px)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };

    const descriptionSemibold: CSSObject = {
      ...description,
      fontWeight: 500,
    };

    const executableAction: CSSObject = {
      fontWeight: 600,
      paddingLeft: '4px',
    };

    return {
      descriptionSemibold,
      executableAction,
    };
  }, []);

  return cached;
};
