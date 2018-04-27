/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Units
export const unit = 16;

export const units = {
  unit,
  eighth: unit / 8,
  quarter: unit / 4,
  half: unit / 2,
  minus: unit * 0.75,
  plus: unit * 1.5,
  double: unit * 2,
  triple: unit * 3,
  quadruple: unit * 4
};

export function px(value) {
  return `${value}px`;
}

export function pct(value) {
  return `${value}%`;
}

// Styling
export const borderRadius = '5px';

// Colors (from dark to light)
const colorBlue1 = '#006E8A';
const colorBlue2 = '#0079a5';
export const colors = {
  black: '#000000',
  black2: '#2d2d2d',
  gray1: '#3f3f3f',
  gray2: '#666666',
  gray3: '#999999',
  gray4: '#d9d9d9',
  gray5: '#f5f5f5',
  white: '#ffffff',
  teal: '#00a69b',
  red: '#a30000',
  yellow: '#FCF2E6',
  blue1: colorBlue1,
  blue2: colorBlue2,

  // custom APM palette
  apmBrown: '#461a0a',
  apmPurple: '#490092',
  apmBlue: '#3185fc',
  apmRed: '#920000',
  apmRed2: '#db1374',
  apmGreen: '#00b3a4',
  apmPink: '#feb6db',
  apmOrange: '#f98510',
  apmTan: '#bfa180',
  apmYellow: '#ecae23',
  apmLightBlue: '#80bcd2',

  // Semantic colors
  link: colorBlue2,
  linkHover: colorBlue1
};

// Fonts
export const fontFamily = '"Open Sans", Helvetica, Arial, sans-serif';
export const fontFamilyCode =
  '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace';

// Font sizes
export const fontSize = '14px';

export const fontSizes = {
  tiny: '10px',
  small: '12px',
  large: '16px',
  xlarge: '20px',
  xxlarge: '30px'
};

export function truncate(width) {
  return `
      max-width: ${width};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
}
