/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ImpactBar } from '..';

describe('ImpactBar component', () => {
  it('should render with default values', () => {
    expect(shallow(<ImpactBar value={25} />)).toMatchSnapshot();
  });

  it('should render with overridden values', () => {
    expect(
      shallow(<ImpactBar value={2} max={5} color="danger" size="s" />)
    ).toMatchSnapshot();
  });
});
