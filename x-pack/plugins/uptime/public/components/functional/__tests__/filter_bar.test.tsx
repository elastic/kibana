/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { FilterBar as FBType } from '../../../../common/graphql/types';
import { FilterBar } from '../filter_bar';

describe('FilterBar component', () => {
  const filterBar: FBType = {
    status: ['up', 'down'],
    port: [80, 443, 9200, 12349],
    id: [
      'http@http://localhost:12349/',
      'http@http://localhost:9200',
      'http@http://www.example.com',
      'http@http://www.google.com/',
      'http@https://news.google.com/',
      'http@https://www.elastic.co',
      'http@https://www.github.com/',
      'http@https://www.google.com/',
      'http@https://www.wikipedia.org/',
      'icmp-icmptest-ip@8.8.8.8',
      'tcp-tcp@localhost:9200',
    ],
    type: ['http', 'icmp', 'tcp'],
  };

  it('renders without errors', () => {
    const component = shallowWithIntl(<FilterBar filterBar={filterBar} updateQuery={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });
});
