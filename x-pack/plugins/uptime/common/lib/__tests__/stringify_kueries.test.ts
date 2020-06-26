/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringifyKueries } from '../stringify_kueries';
import { FilterMap } from '../../types';

describe('stringifyKueries', () => {
  let kueries: FilterMap;
  beforeEach(() => {
    kueries = {
      'observer.geo.name': ['fooValue1', 'fooValue2'],
      'url.port': ['barValue'],
      'monitor.type': [],
      tags: [],
    };
  });

  it('stringifies the current values', () => {
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"(observer.geo.name:fooValue1 or observer.geo.name:fooValue2) and url.port:barValue"`
    );
  });

  it('correctly stringifies a single value', () => {
    kueries['observer.geo.name'] = [];
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(`"url.port:barValue"`);
  });

  it('returns an empty string for an empty map', () => {
    kueries['observer.geo.name'] = [];
    kueries['url.port'] = [];
    expect(stringifyKueries(kueries)).toBe('');
  });

  it('returns an empty string for an empty value', () => {
    kueries['observer.geo.name'] = [];
    kueries['url.port'] = [''];
    expect(stringifyKueries(kueries)).toBe('');
  });

  it('adds quotations if the value contains a space', () => {
    kueries['observer.geo.name'] = ['baz value'];
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"observer.geo.name:\\"baz value\\" and url.port:barValue"`
    );
  });

  it('adds quotations inside parens if there are values containing spaces', () => {
    kueries['observer.geo.name'] = ['foo value 1', 'foo value 2'];
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"(observer.geo.name:\\"foo value 1\\" or observer.geo.name:\\"foo value 2\\") and url.port:barValue"`
    );
  });

  it('handles parens for values with greater than 2 items', () => {
    kueries['url.port'] = ['val1', 'val2', 'val3'];
    kueries['observer.geo.name'] = ['baz 1', 'baz 2'];
    kueries['monitor.type'] = ['single'];
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"(observer.geo.name:\\"baz 1\\" or observer.geo.name:\\"baz 2\\") and (url.port:val1 or url.port:val2 or url.port:val3) and monitor.type:single"`
    );
  });

  it('handles number values', () => {
    kueries['observer.geo.name'] = [];
    kueries['url.port'] = ['80', '8080', '443'];
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"(url.port:80 or url.port:8080 or url.port:443)"`
    );
  });

  it('handles colon characters in values', () => {
    kueries['observer.geo.name'] = ['https://elastic.co', 'https://example.com'];
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"(observer.geo.name:\\"https://elastic.co\\" or observer.geo.name:\\"https://example.com\\") and url.port:barValue"`
    );
  });

  it('handles precending empty array', () => {
    kueries['observer.geo.name'] = ['us-east', 'apj', 'sydney', 'us-west'];
    kueries['url.port'] = [];
    kueries['monitor.type'] = [];
    kueries.tags = [];

    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"(observer.geo.name:us-east or observer.geo.name:apj or observer.geo.name:sydney or observer.geo.name:us-west)"`
    );
  });

  it('handles skipped empty arrays', () => {
    kueries = {
      'monitor.type': ['http'],
      'observer.geo.name': ['us-east', 'apj', 'sydney', 'us-west'],
      'url.port': [],
      tags: [],
    };
    expect(stringifyKueries(kueries)).toMatchInlineSnapshot(
      `"monitor.type:http and (observer.geo.name:us-east or observer.geo.name:apj or observer.geo.name:sydney or observer.geo.name:us-west)"`
    );
  });
});
