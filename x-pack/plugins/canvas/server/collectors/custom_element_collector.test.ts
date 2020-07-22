/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { summarizeCustomElements } from './custom_element_collector';
import { TelemetryCustomElementDocument } from '../../types';

function mockCustomElement(...nodeExpressions: string[]): TelemetryCustomElementDocument {
  return {
    content: JSON.stringify({
      selectedNodes: nodeExpressions.map((expression) => ({
        expression,
      })),
    }),
  };
}

describe('custom_element_collector.handleResponse', () => {
  describe('invalid responses', () => {
    it('returns nothing if no valid hits', () => {
      expect(summarizeCustomElements([])).toEqual({});
    });

    it('returns nothing if no valid elements', () => {
      const customElements = [
        {
          content: 'invalid json',
        },
      ];

      expect(summarizeCustomElements(customElements)).toEqual({});
    });
  });

  it('counts total custom elements', () => {
    const elements = [mockCustomElement(''), mockCustomElement('')];

    const data = summarizeCustomElements(elements);
    expect(data.custom_elements).not.toBe(null);

    if (data.custom_elements) {
      expect(data.custom_elements.count).toEqual(elements.length);
    }
  });

  it('reports all the functions used in custom elements', () => {
    const functions1 = ['a', 'b', 'c'];
    const functions2 = ['c', 'd', 'e', 'f'];
    const expectedFunctions = Array.from(new Set([...functions1, ...functions2]));

    const elements = [mockCustomElement(functions1.join('|')), mockCustomElement(...functions2)];

    const data = summarizeCustomElements(elements);
    expect(data.custom_elements).not.toBe(null);

    if (data.custom_elements) {
      expect(data.custom_elements.functions_in_use).toEqual(expectedFunctions);
    }
  });

  it('reports minimum, maximum, and avg elements in a custom element', () => {
    const functionsMin = ['a', 'b', 'c'];
    const functionsMax = ['d', 'e', 'f', 'g', 'h'];
    const functionsOther = ['i', 'j', 'k', 'l'];
    const avgFunctions = (functionsMin.length + functionsMax.length + functionsOther.length) / 3;

    const elements = [
      mockCustomElement(...functionsMin),
      mockCustomElement(...functionsMax),
      mockCustomElement(...functionsOther),
    ];

    const result = summarizeCustomElements(elements);
    expect(result.custom_elements).not.toBe(null);

    if (result.custom_elements) {
      expect(result.custom_elements.elements.max).toEqual(functionsMax.length);
      expect(result.custom_elements.elements.min).toEqual(functionsMin.length);
      expect(result.custom_elements.elements.avg).toEqual(avgFunctions);
    }
  });
});
