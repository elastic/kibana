/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WatchErrors } from './watch_errors';

describe('watch_errors', () => {
  describe('WatchErrors constructor', () => {
    it('should set "actions" error', () => {
      const watchErrors1 = new WatchErrors();
      const watchErrors2 = new WatchErrors({ actions: { foo: 'bar' } });

      expect(watchErrors1.actions).toEqual(undefined);
      expect(watchErrors2.actions).toEqual({ foo: 'bar' });
    });
  });

  describe('fromUpstreamJson()', () => {
    it('should return WatchErrors instance', () => {
      const instance = WatchErrors.fromUpstreamJson();

      expect(instance instanceof WatchErrors).toBe(true);
    });

    it('should pass errors secctions to the constructor', () => {
      const instance = WatchErrors.fromUpstreamJson({ actions: { foo: 'bar' } });

      expect(instance.actions).toEqual({ foo: 'bar' });
    });
  });

});
