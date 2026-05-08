/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MOCK_EUI_THEME = {
  colors: {
    primary: '#0077CC',
    mediumShade: '#98A2B3',
    primaryText: '#0077CC',
    textPrimary: '#1a1c21',
    emptyShade: '#fff',
    backgroundBasePlain: '#fff',
    textParagraph: '#343741',
    text: '#343741',
    lightShade: '#D3DAE6',
    success: '#00BFB3',
    warning: '#FEC514',
    danger: '#BD271E',
    severity: {
      success: '#00BFB3',
      warning: '#FEC514',
      danger: '#BD271E',
    },
  },
} as const;

/**
 * Full mock EUI theme for useEuiTheme() in tests (colors + size + border + levels + shadows + font + animation).
 * Use in jest.mock('@elastic/eui') with useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME, colorMode: 'LIGHT' }) when colorMode is needed.
 */
export const MOCK_EUI_THEME_FOR_USE_THEME = {
  colors: MOCK_EUI_THEME.colors,
  size: {
    xxs: '2px',
    xs: '4px',
    s: '8px',
    m: '12px',
    l: '24px',
    xl: '32px',
  },
  border: {
    radius: { small: '4px', medium: '6px' },
    width: { thin: '1px', thick: '2px' },
  },
  levels: { content: 1000, header: 2000, menu: 2000 },
  shadows: { s: '0 1px 2px rgba(0,0,0,0.1)' },
  font: { family: '"Inter", sans-serif' },
  animation: { fast: '150ms' },
};
