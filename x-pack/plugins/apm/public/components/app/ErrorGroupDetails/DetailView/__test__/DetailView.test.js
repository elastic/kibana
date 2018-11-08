/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import DetailView from '../index';
import props from './props.json';
import { shallow } from 'enzyme';

import { mockMoment } from '../../../../../utils/testHelpers';

describe('DetailView', () => {
  beforeEach(() => {
    // Avoid timezone issues
    mockMoment();
  });

  it('should render empty state', () => {
    const wrapper = shallow(
      <DetailView
        errorGroup={[]}
        urlParams={props.urlParams}
        location={{ state: '' }}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = shallow(
      <DetailView
        errorGroup={props.errorGroup}
        urlParams={props.urlParams}
        location={{ state: '' }}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
