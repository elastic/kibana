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
    expect(getSafeForExternalLink('#/overview', {}, location)).toBe('#/overview');
  });

  it('should work with a query string', async () => {
    const location = {
      hash: '',
    };
    expect(getSafeForExternalLink('#/overview?foo=bar', {}, location)).toBe('#/overview?foo=bar');
  });

  it('should work without a hash', async () => {
    const location = {
      hash: undefined,
    };
    expect(getSafeForExternalLink('#/overview?foo=bar', {}, location)).toBe('#/overview?foo=bar');
  });

  it('should work with existing query string', async () => {
    const location = {
      hash:
        '#/overview?_g=(cluster_uuid:ae2womLaSMmZBioEQ9wFjw,refreshInterval:(pause:!t,value:10000),time:(from:now-1h,to:now))',
    };
    expect(getSafeForExternalLink('#/overview', {}, location)).toBe(
      '#/overview?_g=(cluster_uuid:ae2womLaSMmZBioEQ9wFjw,refreshInterval:(pause:!t,value:10000),time:(from:now-1h,to:now))'
    );
  });

  it('should override global state, for at least cluster_uuid', async () => {
    const location = {
      hash: `#/home?_g=(cluster_uuid:1,filters:!(),refreshInterval:(pause:!t,value:10000),time:(from:'2017-09-07T20:12:04.011Z',to:'2017-09-07T20:18:55.733Z'))`,
    };
    expect(
      getSafeForExternalLink(
        '#/overview',
        {
          cluster_uuid: 'NDKg6VXAT6-TaGzEK2Zy7g',
        },
        location
      )
    ).toBe(
      `#/overview?_g=(cluster_uuid:'NDKg6VXAT6-TaGzEK2Zy7g',filters:!(),refreshInterval:(pause:!t,value:10000),time:(from:'2017-09-07T20:12:04.011Z',to:'2017-09-07T20:18:55.733Z'))`
    );
  });

  it('should add global state if it does not exist, for at least cluster_uuid', async () => {
    const location = {
      hash: `#/home?_g=(filters:!(),refreshInterval:(pause:!t,value:10000),time:(from:'2017-09-07T20:12:04.011Z',to:'2017-09-07T20:18:55.733Z'))`,
    };
    expect(
      getSafeForExternalLink(
        '#/overview',
        {
          cluster_uuid: 'NDKg6VXAT6-TaGzEK2Zy7g',
        },
        location
      )
    ).toBe(
      `#/overview?_g=(filters:!(),refreshInterval:(pause:!t,value:10000),time:(from:'2017-09-07T20:12:04.011Z',to:'2017-09-07T20:18:55.733Z'),cluster_uuid:'NDKg6VXAT6-TaGzEK2Zy7g')`
    );
  });
});
