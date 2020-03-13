/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturesPlugin } from './plugin';

import { coreMock } from 'src/core/public/mocks';

describe('Features Plugin', () => {
  describe('#setup', () => {
    it('returns expected public contract', () => {
      const plugin = new FeaturesPlugin();
      expect(plugin.setup(coreMock.createSetup())).toMatchInlineSnapshot(`
        Object {
          "getFeatures": [Function],
        }
      `);
    });
  });

  describe('#start', () => {
    it('returns expected public contract', () => {
      const plugin = new FeaturesPlugin();
      plugin.setup(coreMock.createSetup());

      expect(plugin.start()).toMatchInlineSnapshot(`
        Object {
          "getFeatures": [Function],
        }
      `);
    });
  });
});
