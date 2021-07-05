/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  getElasticLogo,
  getElasticOutline,
  functionWrapper,
} from '../../../../../../src/plugins/presentation_util/common/lib';
import { image } from './image';

// TODO: the test was not running and is not up to date
describe('image', () => {
  const fn = functionWrapper(image);

  let elasticLogo;
  let elasticOutline;
  beforeEach(async () => {
    elasticLogo = (await getElasticLogo()).elasticLogo;
    elasticOutline = (await getElasticOutline()).elasticOutline;
  });

  it('returns an image object using a dataUrl', async () => {
    const result = await fn(null, { dataurl: elasticOutline, mode: 'cover' });
    expect(result).to.have.property('type', 'image');
  });

  describe('args', () => {
    describe('dataurl', () => {
      it('sets the source of the image using dataurl', async () => {
        const result = await fn(null, { dataurl: elasticOutline });
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it.skip('sets the source of the image using url', async () => {
        // This is skipped because functionWrapper doesn't use the actual
        // interpreter and doesn't resolve aliases
        const result = await fn(null, { url: elasticOutline });
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it('defaults to the elasticLogo if not provided', async () => {
        const result = await fn(null);
        expect(result).to.have.property('dataurl', elasticLogo);
      });
    });

    describe('sets the mode', () => {
      it('to contain', async () => {
        const result = await fn(null, { mode: 'contain' });
        expect(result).to.have.property('mode', 'contain');
      });

      it('to cover', async () => {
        const result = await fn(null, { mode: 'cover' });
        expect(result).to.have.property('mode', 'cover');
      });

      it('to stretch', async () => {
        const result = await fn(null, { mode: 'stretch' });
        expect(result).to.have.property('mode', '100% 100%');
      });

      it("defaults to 'contain' if not provided", async () => {
        const result = await fn(null);
        expect(result).to.have.property('mode', 'contain');
      });
    });
  });
});
