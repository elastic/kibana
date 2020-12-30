/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseRoute } from './helpers';

describe('public helpers parseRoute', () => {
  it('should properly parse hash route', () => {
    const hashSearch =
      '?timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)),timeline:(linkTo:!(global),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)))';
    const hashLocation = {
      hash: `#/detections/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit${hashSearch}`,
      pathname: '/app/siem',
      search: '',
    };

    expect(parseRoute(hashLocation)).toEqual({
      pageName: 'detections',
      path: `/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit${hashSearch}`,
      search: hashSearch,
    });
  });

  it('should properly parse non-hash route', () => {
    const nonHashLocation = {
      hash: '',
      pathname: '/app/security/detections/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit',
      search:
        '?timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)),timeline:(linkTo:!(global),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)))',
    };

    expect(parseRoute(nonHashLocation)).toEqual({
      pageName: 'detections',
      path: `/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit${nonHashLocation.search}`,
      search: nonHashLocation.search,
    });
  });

  it('should properly parse non-hash subplugin route', () => {
    const nonHashLocation = {
      hash: '',
      pathname: '/app/security/detections',
      search:
        '?timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)),timeline:(linkTo:!(global),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)))',
    };

    expect(parseRoute(nonHashLocation)).toEqual({
      pageName: 'detections',
      path: `${nonHashLocation.search}`,
      search: nonHashLocation.search,
    });
  });
});
