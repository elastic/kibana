/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { transparentize } from '@elastic/eui';
import { useEuiTheme } from '../../../hooks';

export const useStyles = (depth: number) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors } = euiTheme;

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
        border: `1px dashed ${colors.mediumShade}`,
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
    const leafNodeButton: CSSObject = {
      marginLeft: size.l,
      width: `calc(100% - ${size.l})`,
      paddingLeft: 0,
    };
    const labelIcon: CSSObject = {
      marginRight: size.s,
      marginLeft: size.s,
    };

    const treeViewWrapper = (expanded: boolean): CSSObject => ({
      display: !expanded ? 'none' : 'inherit',
      '.euiTreeView__node--selected > .euiTreeView__nodeInner': {
        backgroundColor: transparentize(colors.darkestShade, 0.1),
      },
      '.euiTreeView__node--expanded': {
        maxHeight: '100%',
      },
      '.euiTreeView__nodeInner .euiToolTipAnchor': {
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        wordWrap: 'normal',
      },
    });

    return {
      loadMoreButton,
      loadMoreButtonWrapper,
      loadMoreText,
      loadMoreTextLeft,
      leafNodeButton,
      labelIcon,
      treeViewWrapper,
    };
  }, [euiTheme, depth]);

  return cached;
};
