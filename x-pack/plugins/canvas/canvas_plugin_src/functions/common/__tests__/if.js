/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ifFn } from '../if';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('if', () => {
  const fn = functionWrapper(ifFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', async () => {
        expect(await fn(null, { condition: true, then: () => 'foo' })).to.be('foo');
        expect(await fn(null, { condition: true, then: () => 'foo', else: () => 'bar' })).to.be(
          'foo'
        );
      });

      it('without then', async () => {
        expect(await fn(null, { condition: true })).to.be(null);
        expect(await fn('some context', { condition: true })).to.be('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', async () =>
        expect(
          await fn('some context', { condition: false, then: () => 'foo', else: () => 'bar' })
        ).to.be('bar'));

      it('without else', async () =>
        expect(await fn('some context', { condition: false, then: () => 'foo' })).to.be(
          'some context'
        ));
    });

    describe('falsy values', () => {
      describe('for then', () => {
        it('with null', async () =>
          expect(await fn('some context', { condition: true, then: () => null })).to.be(null));

        it('with false', async () =>
          expect(await fn('some context', { condition: true, then: () => false })).to.be(false));

        it('with 0', async () =>
          expect(await fn('some context', { condition: true, then: () => 0 })).to.be(0));
      });

      describe('for else', () => {
        it('with null', async () =>
          expect(await fn('some context', { condition: false, else: () => null })).to.be(null));

        it('with false', async () =>
          expect(await fn('some context', { condition: false, else: () => false })).to.be(false));

        it('with 0', async () =>
          expect(await fn('some context', { condition: false, else: () => 0 })).to.be(0));
      });
    });
  });

  // TODO: Passing through context
});
