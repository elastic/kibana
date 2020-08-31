/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { computeScale, AutoScale } from './auto_scale';
import { render } from 'enzyme';

const mockElement = (clientWidth = 100, clientHeight = 200) => ({
  clientHeight,
  clientWidth,
});

describe('AutoScale', () => {
  describe('computeScale', () => {
    it('is 1 if any element is null', () => {
      expect(computeScale(null, null)).toBe(1);
      expect(computeScale(mockElement(), null)).toBe(1);
      expect(computeScale(null, mockElement())).toBe(1);
    });

    it('is never over 1', () => {
      expect(computeScale(mockElement(2000, 2000), mockElement(1000, 1000))).toBe(1);
    });

    it('is never under 0.3 in default case', () => {
      expect(computeScale(mockElement(2000, 1000), mockElement(1000, 10000))).toBe(0.3);
    });

    it('is never under specified min scale if specified', () => {
      expect(computeScale(mockElement(2000, 1000), mockElement(1000, 10000), 0.1)).toBe(0.1);
    });

    it('is the lesser of the x or y scale', () => {
      expect(computeScale(mockElement(2000, 2000), mockElement(3000, 5000))).toBe(0.4);
      expect(computeScale(mockElement(2000, 3000), mockElement(4000, 3200))).toBe(0.5);
    });
  });

  describe('AutoScale', () => {
    it('renders', () => {
      expect(
        render(
          <AutoScale>
            <h1>Hoi!</h1>
          </AutoScale>
        )
      ).toMatchInlineSnapshot(`
        <div
          style="display:flex;justify-content:center;align-items:center;max-width:100%;max-height:100%;overflow:hidden;line-height:1.5"
        >
          <div
            style="transform:scale(0)"
          >
            <h1>
              Hoi!
            </h1>
          </div>
        </div>
      `);
    });
  });
});
