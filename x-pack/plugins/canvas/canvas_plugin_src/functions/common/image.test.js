/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// import { functionWrapper } from '../../../test_helpers/function_wrapper';
import { elasticLogo } from '../../lib/elastic_logo';
import { elasticOutline } from '../../lib/elastic_outline';
// import { image } from './image';

// TODO: the test was not running and is not up to date
describe.skip('image', () => {
  // const fn = functionWrapper(image);
  const fn = jest.fn();

  it('returns an image object using a dataUrl', () => {
    const result = fn(null, { dataurl: elasticOutline, mode: 'cover' });
    expect(result).to.have.property('type', 'image');
  });

  describe('args', () => {
    describe('dataurl', () => {
      it('sets the source of the image using dataurl', () => {
        const result = fn(null, { dataurl: elasticOutline });
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it.skip('sets the source of the image using url', () => {
        // This is skipped because functionWrapper doesn't use the actual
        // interpreter and doesn't resolve aliases
        const result = fn(null, { url: elasticOutline });
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it('defaults to the elasticLogo if not provided', () => {
        const result = fn(null);
        expect(result).to.have.property('dataurl', elasticLogo);
      });
    });

    describe('mode', () => {
      it('sets the mode', () => {
        it('to contain', () => {
          const result = fn(null, { mode: 'contain' });
          expect(result).to.have.property('mode', 'contain');
        });

        it('to cover', () => {
          const result = fn(null, { mode: 'cover' });
          expect(result).to.have.property('mode', 'cover');
        });

        it('to stretch', () => {
          const result = fn(null, { mode: 'stretch' });
          expect(result).to.have.property('mode', 'stretch');
        });

        it("defaults to 'contain' if not provided", () => {
          const result = fn(null);
          expect(result).to.have.property('mode', 'contain');
        });
      });
    });
  });
});
