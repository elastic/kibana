/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';

import { TrustedAppsPage } from './trusted_apps_page';

describe('TrustedAppsPage', () => {
  test('rendering', () => {
    expect(shallow(<TrustedAppsPage />)).toMatchSnapshot();
  });
});
