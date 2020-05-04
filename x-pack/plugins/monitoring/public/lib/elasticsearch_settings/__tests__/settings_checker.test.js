/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SettingsChecker } from '../checkers/settings_checker';

describe('Settings Checker Class for Elasticsearch Settings', () => {
  const getHttp = () => ({
    get() {
      return Promise.resolve({
        data: {
          found: true,
          reason: { context: 'unit_test' },
        },
      });
    },
  });

  it('should construct a settings checker object', async () => {
    const checker = new SettingsChecker(getHttp());
    checker.setApi('../api/monitoring/v1/elasticsearch_settings/check/example');
    checker.setMessage('Checking example for unit test');

    expect(checker.getApi()).toBe('../api/monitoring/v1/elasticsearch_settings/check/example');
    expect(checker.getMessage()).toBe('Checking example for unit test');
    expect(checker.hasNext()).toBe(false);

    expect(await checker.executeCheck()).toEqual({
      found: true,
      reason: { context: 'unit_test' },
    });
  });
});
