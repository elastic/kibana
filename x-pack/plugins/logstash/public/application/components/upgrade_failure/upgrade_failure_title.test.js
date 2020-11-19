/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { UpgradeFailureTitle } from './upgrade_failure_title';

describe('UpgradeFailureTitle component', () => {
  let props;
  beforeEach(() => {
    props = { titleText: 'the Title' };
  });

  it('renders component as expected', () => {
    const wrapper = shallow(<UpgradeFailureTitle {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
