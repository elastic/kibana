/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as savedObject from 'x-pack/plugins/apm/public/services/rest/savedObjects';
import { mountWithStore } from 'x-pack/plugins/apm/public/utils/testHelpers';
import { DiscoverLink } from '../DiscoverLink';

describe('DiscoverLink', () => {
  it('should apply indexPattern to url', async () => {
    const spy = jest
      .spyOn(savedObject, 'getAPMIndexPattern')
      .mockResolvedValue({ id: 'myIndexPatternId' });

    const state = { location: {} };
    const wrapper = mountWithStore(
      <DiscoverLink query={{}}>View in Discover</DiscoverLink>,
      state
    );

    // TODO: This is nasty - how to wait for render-prop to re-render with async index pattern?
    await new Promise(resolve => setTimeout(resolve, 100));
    wrapper.update();

    expect(wrapper.find('EuiLink').prop('href')).toEqual(
      '/app/kibana#/discover?_a=(index:myIndexPatternId)&_g=(time:(from:now-24h,mode:quick,to:now))'
    );
  });
});
