/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { progress } from '../progress';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../../i18n';
import { fontStyle } from './fixtures/test_styles';

const errors = getFunctionErrors().progress;

describe('progress', () => {
  const fn = functionWrapper(progress);
  const value = 0.33;

  it('returns a render as progress', () => {
    const result = fn(0.2);
    expect(result).to.have.property('type', 'render').and.to.have.property('as', 'progress');
  });

  it('sets the progress to context', () => {
    const result = fn(0.58);
    expect(result.value).to.have.property('value', 0.58);
  });

  it(`throws when context is outside of the valid range`, () => {
    expect(fn)
      .withArgs(3)
      .to.throwException(new RegExp(errors.invalidValue(3).message));
  });

  describe('args', () => {
    describe('shape', () => {
      it('sets the progress element shape', () => {
        const result = fn(value, {
          shape: 'wheel',
        });
        expect(result.value).to.have.property('shape', 'wheel');
      });

      it(`defaults to 'gauge'`, () => {
        const result = fn(value);
        expect(result.value).to.have.property('shape', 'gauge');
      });
    });

    describe('max', () => {
      it('sets the maximum value', () => {
        const result = fn(value, {
          max: 2,
        });
        expect(result.value).to.have.property('max', 2);
      });

      it('defaults to 1', () => {
        const result = fn(value);
        expect(result.value).to.have.property('max', 1);
      });

      it('throws if max <= 0', () => {
        expect(fn)
          .withArgs(value, { max: -0.5 })
          .to.throwException(new RegExp(errors.invalidMaxValue(-0.5).message));
      });
    });

    describe('valueColor', () => {
      it('sets the color of the progress bar', () => {
        const result = fn(value, {
          valueColor: '#000000',
        });
        expect(result.value).to.have.property('valueColor', '#000000');
      });

      it(`defaults to '#1785b0'`, () => {
        const result = fn(value);
        expect(result.value).to.have.property('valueColor', '#1785b0');
      });
    });

    describe('barColor', () => {
      it('sets the color of the background bar', () => {
        const result = fn(value, {
          barColor: '#FFFFFF',
        });
        expect(result.value).to.have.property('barColor', '#FFFFFF');
      });

      it(`defaults to '#f0f0f0'`, () => {
        const result = fn(value);
        expect(result.value).to.have.property('barColor', '#f0f0f0');
      });
    });

    describe('valueWeight', () => {
      it('sets the thickness of the bars', () => {
        const result = fn(value, {
          valuWeight: 100,
        });

        expect(result.value).to.have.property('valuWeight', 100);
      });

      it(`defaults to 20`, () => {
        const result = fn(value);
        expect(result.value).to.have.property('barWeight', 20);
      });
    });

    describe('barWeight', () => {
      it('sets the thickness of the bars', () => {
        const result = fn(value, {
          barWeight: 50,
        });

        expect(result.value).to.have.property('barWeight', 50);
      });

      it(`defaults to 20`, () => {
        const result = fn(value);
        expect(result.value).to.have.property('barWeight', 20);
      });
    });

    describe('label', () => {
      it('sets the label of the progress', () => {
        const result = fn(value, { label: 'foo' });

        expect(result.value).to.have.property('label', 'foo');
      });

      it('hides the label if false', () => {
        const result = fn(value, {
          label: false,
        });
        expect(result.value).to.have.property('label', '');
      });

      it('defaults to true which sets the context as the label', () => {
        const result = fn(value);
        expect(result.value).to.have.property('label', '0.33');
      });
    });

    describe('font', () => {
      it('sets the font style for the label', () => {
        const result = fn(value, {
          font: fontStyle,
        });

        expect(result.value).to.have.property('font');
        expect(result.value.font).to.have.keys(Object.keys(fontStyle));
        expect(result.value.font.spec).to.have.keys(Object.keys(fontStyle.spec));
      });

      it('sets fill to color', () => {
        const result = fn(value, {
          font: fontStyle,
        });
        expect(result.value.font.spec).to.have.property('fill', fontStyle.spec.color);
      });

      // TODO: write test when using an instance of the interpreter
      // it("sets a default style for the label when not provided", () => {});
    });
  });
});
