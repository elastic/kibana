/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { elasticOutline } from '../../lib/elastic_outline';
import { elasticLogo } from '../../lib/elastic_logo';
import { getFunctionErrors } from '../../../i18n';
import { revealImage } from './revealImage';

const errors = getFunctionErrors().revealImage;

describe('revealImage', () => {
  const fn = functionWrapper(revealImage);

  it('returns a render as revealImage', () => {
    const result = fn(0.5);
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'revealImage');
  });

  describe('context', () => {
    it('throws when context is not a number between 0 and 1', () => {
      expect(() => {
        fn(10, {
          image: elasticLogo,
          emptyImage: elasticOutline,
          origin: 'top',
        });
      }).toThrow(new RegExp(errors.invalidPercent(10).message));

      expect(() => {
        fn(-0.1, {
          image: elasticLogo,
          emptyImage: elasticOutline,
          origin: 'top',
        });
      }).toThrow(new RegExp(errors.invalidPercent(-0.1).message));
    });
  });

  describe('args', () => {
    describe('image', () => {
      it('sets the image', () => {
        const result = fn(0.89, { image: elasticLogo }).value;
        expect(result).toHaveProperty('image', elasticLogo);
      });

      it('defaults to the Elastic outline logo', () => {
        const result = fn(0.89).value;
        expect(result).toHaveProperty('image', elasticOutline);
      });
    });

    describe('emptyImage', () => {
      it('sets the background image', () => {
        const result = fn(0, { emptyImage: elasticLogo }).value;
        expect(result).toHaveProperty('emptyImage', elasticLogo);
      });

      it('sets emptyImage to null', () => {
        const result = fn(0).value;
        expect(result).toHaveProperty('emptyImage', null);
      });
    });

    describe('origin', () => {
      it('sets which side to start the reveal from', () => {
        let result = fn(1, { origin: 'top' }).value;
        expect(result).toHaveProperty('origin', 'top');
        result = fn(1, { origin: 'left' }).value;
        expect(result).toHaveProperty('origin', 'left');
        result = fn(1, { origin: 'bottom' }).value;
        expect(result).toHaveProperty('origin', 'bottom');
        result = fn(1, { origin: 'right' }).value;
        expect(result).toHaveProperty('origin', 'right');
      });

      it('defaults to bottom', () => {
        const result = fn(1).value;
        expect(result).toHaveProperty('origin', 'bottom');
      });
    });
  });
});
