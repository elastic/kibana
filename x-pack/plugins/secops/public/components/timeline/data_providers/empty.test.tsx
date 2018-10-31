/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { Empty } from './empty';

describe('Empty', () => {
  describe('rendering', () => {
    test('it renders the expected message', () => {
      const wrapper = mount(<Empty />);

      expect(wrapper.text()).toEqual('Drop anything with a Facet count here');
    });
  });
});
