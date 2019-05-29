/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { openSans } from '../../../../common/lib/fonts';
import { font } from '../font';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';

const errors = getFunctionErrors().font;

describe('font', () => {
  const fn = functionWrapper(font);

  describe('default output', () => {
    const result = fn(null);

    it('returns a style', () => {
      expect(result)
        .to.have.property('type', 'style')
        .and.to.have.property('spec')
        .and.to.have.property('css');
    });
  });

  describe('args', () => {
    describe('size', () => {
      it('sets font size', () => {
        const result = fn(null, { size: 20 });
        expect(result.spec).to.have.property('fontSize', '20px');
        expect(result.css).to.contain('font-size:20px');
      });

      it('defaults to 14px', () => {
        const result = fn(null);
        expect(result.spec).to.have.property('fontSize', '14px');
        expect(result.css).to.contain('font-size:14px');
      });
    });

    describe('lHeight', () => {
      it('sets line height', () => {
        const result = fn(null, { lHeight: 30 });
        expect(result.spec).to.have.property('lineHeight', '30px');
        expect(result.css).to.contain('line-height:30px');
      });

      it('defaults to 1', () => {
        const result = fn(null);
        expect(result.spec).to.have.property('lineHeight', 1);
        expect(result.css).to.contain('line-height:1');
      });
    });

    describe('family', () => {
      it('sets font family', () => {
        const result = fn(null, { family: 'Optima, serif' });
        expect(result.spec).to.have.property('fontFamily', 'Optima, serif');
        expect(result.css).to.contain('font-family:Optima, serif');
      });

      it(`defaults to "${openSans.value}"`, () => {
        const result = fn(null);
        expect(result.spec).to.have.property('fontFamily', `"${openSans.value}"`);
        expect(result.css).to.contain(`font-family:"${openSans.value}"`);
      });
    });

    describe('color', () => {
      it('sets font color', () => {
        const result = fn(null, { color: 'blue' });
        expect(result.spec).to.have.property('color', 'blue');
        expect(result.css).to.contain('color:blue');
      });
    });

    describe('weight', () => {
      it('sets font weight', () => {
        let result = fn(null, { weight: 'normal' });
        expect(result.spec).to.have.property('fontWeight', 'normal');
        expect(result.css).to.contain('font-weight:normal');

        result = fn(null, { weight: 'bold' });
        expect(result.spec).to.have.property('fontWeight', 'bold');
        expect(result.css).to.contain('font-weight:bold');

        result = fn(null, { weight: 'bolder' });
        expect(result.spec).to.have.property('fontWeight', 'bolder');
        expect(result.css).to.contain('font-weight:bolder');

        result = fn(null, { weight: 'lighter' });
        expect(result.spec).to.have.property('fontWeight', 'lighter');
        expect(result.css).to.contain('font-weight:lighter');

        result = fn(null, { weight: '400' });
        expect(result.spec).to.have.property('fontWeight', '400');
        expect(result.css).to.contain('font-weight:400');
      });

      it("defaults to 'normal'", () => {
        const result = fn(null);
        expect(result.spec).to.have.property('fontWeight', 'normal');
        expect(result.css).to.contain('font-weight:normal');
      });

      it('throws when provided an invalid weight', () => {
        expect(() => fn(null, { weight: 'foo' })).to.throwException(
          new RegExp(errors.invalidFontWeight('foo').message)
        );
      });
    });

    describe('underline', () => {
      it('sets text underline', () => {
        let result = fn(null, { underline: true });
        expect(result.spec).to.have.property('textDecoration', 'underline');
        expect(result.css).to.contain('text-decoration:underline');

        result = fn(null, { underline: false });
        expect(result.spec).to.have.property('textDecoration', 'none');
        expect(result.css).to.contain('text-decoration:none');
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result.spec).to.have.property('textDecoration', 'none');
        expect(result.css).to.contain('text-decoration:none');
      });
    });

    describe('italic', () => {
      it('sets italic', () => {
        let result = fn(null, { italic: true });
        expect(result.spec).to.have.property('fontStyle', 'italic');
        expect(result.css).to.contain('font-style:italic');

        result = fn(null, { italic: false });
        expect(result.spec).to.have.property('fontStyle', 'normal');
        expect(result.css).to.contain('font-style:normal');
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result.spec).to.have.property('fontStyle', 'normal');
        expect(result.css).to.contain('font-style:normal');
      });
    });

    describe('align', () => {
      it('sets text alignment', () => {
        let result = fn(null, { align: 'left' });
        expect(result.spec).to.have.property('textAlign', 'left');
        expect(result.css).to.contain('text-align:left');

        result = fn(null, { align: 'center' });
        expect(result.spec).to.have.property('textAlign', 'center');
        expect(result.css).to.contain('text-align:center');

        result = fn(null, { align: 'right' });
        expect(result.spec).to.have.property('textAlign', 'right');
        expect(result.css).to.contain('text-align:right');

        result = fn(null, { align: 'justify' });
        expect(result.spec).to.have.property('textAlign', 'justify');
        expect(result.css).to.contain('text-align:justify');
      });

      it(`defaults to 'left'`, () => {
        const result = fn(null);
        expect(result.spec).to.have.property('textAlign', 'left');
        expect(result.css).to.contain('text-align:left');
      });

      it('throws when provided an invalid alignment', () => {
        expect(fn)
          .withArgs(null, { align: 'foo' })
          .to.throwException(errors.invalidTextAlignment('foo').message);
      });
    });
  });
});
