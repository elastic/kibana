/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FontLabel } from '../../../common/lib/fonts';
export { FontLabel as FontFamily, FontValue } from '../../../common/lib/fonts';

/**
 * Type containing font weights.
 */
export enum FontWeight {
  NORMAL = 'normal',
  BOLD = 'bold',
  BOLDER = 'bolder',
  LIGHTER = 'lighter',
  ONE = '100',
  TWO = '200',
  THREE = '300',
  FOUR = '400',
  FIVE = '500',
  SIX = '600',
  SEVEN = '700',
  EIGHT = '800',
  NINE = '900',
}

/**
 * Type containing valid text alignments.
 */
export type TextAlignment = 'center' | 'left' | 'right' | 'justify';

/**
 * Collection of text alignments.
 */
export const TEXT_ALIGNMENTS: TextAlignment[] = ['center', 'left', 'right', 'justify'];

/**
 * Represents the various style properties that can be applied to an element.
 */
export interface CSSStyle {
  color?: string;
  fill?: string;
  fontFamily?: FontLabel;
  fontSize?: string;
  fontStyle?: 'italic' | 'normal';
  fontWeight?: FontWeight;
  lineHeight?: number | string;
  textAlign?: TextAlignment;
  textDecoration?: 'underline' | 'none';
}

/**
 * Represents an object containing style information for a Container.
 */
export interface ContainerStyle {
  border: string | null;
  borderRadius: string | null;
  padding: string | null;
  backgroundColor: string | null;
  backgroundImage: string | null;
  backgroundSize: 'contain' | 'cover' | 'auto';
  backgroundRepeat: 'repeat-x' | 'repeat' | 'space' | 'round' | 'no-repeat' | 'space';
  opacity: number | null;
  overflow: 'visible' | 'hidden' | 'scroll' | 'auto';
}

/**
 * An object that represents style information, typically CSS.
 */
export interface Style {
  type: 'style';
  spec: CSSStyle;
  css: string;
}
