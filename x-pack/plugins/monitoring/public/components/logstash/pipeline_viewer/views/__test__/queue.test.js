/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Queue } from '../queue';
import { shallow } from 'enzyme';

describe('Queue component', () => {
  it('renders default elements', () => {
    expect(shallow(<Queue />)).toMatchSnapshot();
  });
});
