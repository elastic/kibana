/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { metric } from '../metric';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { fontStyle } from './fixtures/test_styles';

describe('metric', () => {
  const fn = functionWrapper(metric);

  it('returns a render as metric', () => {
    const result = fn(null);
    expect(result)
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'metric');
  });

  it('sets the metric to context', () => {
    const result = fn('2');
    expect(result.value).to.have.property('metric', '2');
  });

  it(`defaults metric to '?' when context is missing`, () => {
    const result = fn(null);
    expect(result.value).to.have.property('metric', '?');
  });

  describe('args', () => {
    describe('label', () => {
      it('sets the label of the metric', () => {
        const result = fn(null, {
          label: 'My Label',
        });

        expect(result.value).to.have.property('label', 'My Label');
      });
    });

    describe('metricStyle', () => {
      it('sets the font style for the metric', () => {
        const result = fn(null, {
          metricFont: fontStyle,
        });

        expect(result.value).to.have.property('metricFont', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("sets a default style for the metric when not provided, () => {});
    });

    describe('labelStyle', () => {
      it('sets the font style for the label', () => {
        const result = fn(null, {
          labelFont: fontStyle,
        });

        expect(result.value).to.have.property('labelFont', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("sets a default style for the label when not provided, () => {});
    });
  });
});
