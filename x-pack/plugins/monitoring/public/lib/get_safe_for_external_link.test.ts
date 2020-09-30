/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSafeForExternalLink } from './get_safe_for_external_link';

describe('getSafeForExternalLink', () => {
  it('should work without a query string', async () => {
    const location = {
      hash: '',
    };
    expect(getSafeForExternalLink('#/overview', location)).toBe('#/overview');
  });

  it('should work with a query string', async () => {
    const location = {
      hash: '',
    };
    expect(getSafeForExternalLink('#/overview?foo=bar', location)).toBe('#/overview?foo=bar');
  });

  it('should work with existing query string', async () => {
    const location = {
      hash:
        '#/overview?_g=(cluster_uuid:ae2womLaSMmZBioEQ9wFjw,refreshInterval:(pause:!t,value:10000),time:(from:now-1h,to:now))',
    };
    expect(getSafeForExternalLink('#/overview?_g=(cluster_uuid:another_one)', location)).toBe(
      '#/overview?_g=(cluster_uuid:another_one)'
    );
  });
});
