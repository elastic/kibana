/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFiltersFromMap } from './use_selected_filters';

describe('useSelectedFilters', () => {
  describe('getFiltersFromMap', () => {
    it('returns defaults if map is not defined', () => {
      expect(getFiltersFromMap(undefined)).toEqual({
        locations: [],
        ports: [],
        schemes: [],
        tags: [],
      });
    });

    const DEFAULT_MAP = {
      locations: [],
      ports: [],
      schemes: [],
      tags: [],
    };
    it.each([
      ['tags', 'tags', ['prod', 'test']],
      ['ports', 'url.port', ['5601', '9200']],
      ['locations', 'observer.geo.name', ['nyc', 'lax']],
      ['schemes', 'monitor.type', ['browser', 'http', 'icmp', 'tcp']],
    ])('initializes and maps existing values', (key, esKey, values) => {
      const map = new Map();
      map.set(esKey, values);
      expect(getFiltersFromMap(map)).toEqual(
        Object.assign({
          ...DEFAULT_MAP,
          [key]: values,
        })
      );
    });
  });
});
