/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

export const AnalyticsCollectionCardStyles = (euiTheme: EuiThemeComputed) => ({
  badge: {
    '.euiBadge__text': { color: euiTheme.colors.mediumShade },
    color: euiTheme.colors.subduedText,
    cursor: 'inherit',
  },
  card: {
    '& .euiCard__titleAnchor': {
      alignItems: 'start',
      display: 'flex',
      gap: euiTheme.size.s,
      justifyContent: 'space-between',
    },
    '&:hover': {
      '&__text': { color: euiTheme.colors.subduedText },
      '.euiBadge': {
        color: euiTheme.colors.text,
      },
      '.euiCard__titleAnchor': { textDecoration: 'none !important' },
    },
    height: 200,
    overflow: 'hidden',
    position: 'relative' as 'relative',
    width: '100%',
  },
  chart: {
    '.euiPanel:hover &': {
      transform: 'scale(1.03)',
    },
    bottom: 0,
    left: 0,
    position: 'absolute !important' as 'absolute',
    right: 0,
    transition: `transform ${euiTheme.animation.normal}`,
  },
  footer: { position: 'relative' as 'relative', zIndex: 1 },
  subtitle: {
    fontWeight: euiTheme.font.weight.light,
    position: 'relative' as 'relative',
    zIndex: 1,
  },
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as 'nowrap',
  },
});
