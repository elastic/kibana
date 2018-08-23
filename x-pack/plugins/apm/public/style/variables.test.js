/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from './variables';

describe('Style variable helpers', () => {
  describe('rgba', () => {
    it('should convert hex to rgba, defaulting to alpha value 1', () => {
      expect(rgba('#000000')).toEqual('rgba(0,0,0,1)');
      expect(rgba('#ffffff')).toEqual('rgba(255,255,255,1)');
    });

    it('should convert hex to rgba with passed in alpha value', () => {
      expect(rgba('#000000', 0.35)).toEqual('rgba(0,0,0,0.35)');
    });

    it('should convert short-form hex codes to rgba', () => {
      expect(rgba('#000')).toEqual('rgba(0,0,0,1)');
    });

    it('should convert an hsla value, retaining the alpha value', () => {
      expect(rgba('hsla(0, 0%, 0%, 0.2)')).toEqual('rgba(0,0,0,0.2)');
    });
  });
});
