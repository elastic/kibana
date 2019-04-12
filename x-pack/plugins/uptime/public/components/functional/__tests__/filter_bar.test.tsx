/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { FilterBarComponent } from '../filter_bar';

describe('FilterBar component', () => {
  const data = {
    filterBar: {
      ports: [9200, 12349],
      ids: [
        { key: 'auto-tcp-0X81440A68E839814C', url: 'tcp://localhost:9200' },
        { key: 'auto-http-0X3675F89EF0612091', url: 'http://localhost:12349/' },
        { key: 'auto-http-0X970CBD2F2102BFA8', url: 'http://www.google.com/' },
        { key: 'auto-http-0X131221E73F825974', url: 'https://www.google.com/' },
        { key: 'auto-http-0X9CB71300ABD5A2A8', url: 'https://www.github.com/' },
        { key: 'auto-http-0XD9AE729FC1C1E04A', url: 'http://www.reddit.com/' },
        { key: 'auto-http-0XDD2D4E60FD4A61C3', url: 'https://www.elastic.co' },
        { key: 'auto-http-0XA8096548ECEB85B7', url: 'http://www.example.com/' },
        { key: 'auto-http-0XC9CDA429418EDC2B', url: 'https://www.wikipedia.org/' },
        { key: 'auto-http-0XE3B163481423197D', url: 'https://news.google.com/' },
      ],
      names: [],
      schemes: ['tcp', 'http'],
    },
  };
  let currentQuery;

  it('renders the component without errors', () => {
    currentQuery = undefined;
    const component = shallowWithIntl(
      <FilterBarComponent
        currentQuery={currentQuery}
        data={data}
        loading={false}
        updateQuery={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
