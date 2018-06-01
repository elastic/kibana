/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { PageHeader } from './page_header';
import { EuiHeaderBreadcrumbs } from '@elastic/eui';

test('it renders without crashing', () => {
  const wrapper = shallow(<PageHeader breadcrumbs={[]} />);
  expect(wrapper.find(EuiHeaderBreadcrumbs)).toHaveLength(1);
  expect(wrapper).toMatchSnapshot();
});

test('it renders breadcrumbs', () => {
  const breadcrumbs = [{
    display: 'item-1',
    href: '#item-1',
  }, {
    display: 'item-2',
    href: '#item-2',
  }, {
    display: 'item-3',
    href: '#item-3',
  }];

  const wrapper = mount(<PageHeader breadcrumbs={breadcrumbs} />);
  expect(wrapper.find(EuiHeaderBreadcrumbs)).toHaveLength(1);
});
