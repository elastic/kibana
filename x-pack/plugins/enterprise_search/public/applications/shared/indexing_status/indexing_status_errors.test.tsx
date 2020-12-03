/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { EuiButtonTo } from '../react_router_helpers';

import { IndexingStatusErrors } from './indexing_status_errors';

describe('IndexingStatusErrors', () => {
  it('renders', () => {
    const wrapper = shallow(<IndexingStatusErrors viewLinkPath="/path" />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiButtonTo)).toHaveLength(1);
    expect(wrapper.find(EuiButtonTo).prop('to')).toEqual('/path');
  });
});
