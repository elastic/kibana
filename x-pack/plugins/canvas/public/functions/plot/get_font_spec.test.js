/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fontStyle } from '../../../canvas_plugin_src/functions/common/__fixtures__/test_styles';
import { defaultSpec, getFontSpec } from './get_font_spec';

describe('getFontSpec', () => {
  describe('default output', () => {
    it('returns the default spec object', () => {
      expect(getFontSpec()).toEqual(defaultSpec);
    });
  });

  describe('convert from fontStyle object', () => {
    it('returns plot font spec', () => {
      expect(getFontSpec(fontStyle)).toEqual({
        size: 14,
        lHeight: 21,
        style: 'normal',
        weight: 'bolder',
        family: 'Chalkboard, serif',
        color: 'pink',
      });
    });
  });
});
