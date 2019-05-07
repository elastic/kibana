/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { EmptyPage } from './index';

test('renders correctly', () => {
  const EmptyComponent = shallow(
    <EmptyPage
      title="My Super Title"
      message="My awesome message"
      actionLabel="Do Something"
      actionUrl="my/url/from/nowwhere"
    />
  );
  expect(toJson(EmptyComponent)).toMatchSnapshot();
});
