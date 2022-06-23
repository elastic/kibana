/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../../hooks';

export const useStyles = (depth: number) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size } = euiTheme;

    const loadMoreButtonWrapper: CSSObject = {
      position: 'relative',
      textAlign: 'center',
      width: `calc(100% + ${depth * 24}px)`,
      marginLeft: `-${depth * 24}px`,
      '&:after': {
        content: `''`,
        position: 'absolute',
        top: '50%',
        width: '100%',
        border: '1px dashed rgb(152, 162, 179)',
        left: 0,
      },
    };
    const loadMoreButton: CSSObject = {
      position: 'relative',
      cursor: 'pointer',
      zIndex: 2,
    };
    const loadMoreText: CSSObject = {
      marginRight: size.s,
    };
    const loadMoreTextLeft: CSSObject = {
      marginLeft: size.s,
    };
    const labelIcon: CSSObject = {
      marginRight: size.s,
      marginLeft: size.s,
    };

    return {
      loadMoreButton,
      loadMoreButtonWrapper,
      loadMoreText,
      loadMoreTextLeft,
      labelIcon,
    };
  }, [euiTheme, depth]);

  return cached;
};
