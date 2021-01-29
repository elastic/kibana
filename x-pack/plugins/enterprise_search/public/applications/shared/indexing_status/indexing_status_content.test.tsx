/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiProgress, EuiTitle } from '@elastic/eui';

import { IndexingStatusContent } from './indexing_status_content';

describe('IndexingStatusContent', () => {
  it('renders', () => {
    const wrapper = shallow(<IndexingStatusContent percentageComplete={50} />);

    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find(EuiProgress)).toHaveLength(1);
  });
});
