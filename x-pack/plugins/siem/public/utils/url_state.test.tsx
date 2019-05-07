/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { shallow } from 'enzyme';
// import * as React from 'react';

import { replaceStateKeyInQueryString } from '../components/url_state';

describe('url_state', () => {
  test('url_state', () => {
    const result = replaceStateKeyInQueryString('yourmom', 2);
    expect(result).toEqual(12);
  });
});
