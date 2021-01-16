/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/react_router_history.mock';

import React from 'react';
import { useParams } from 'react-router-dom';
import { shallow } from 'enzyme';

import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';

import { QueryDetail } from './';

describe('QueryDetail', () => {
  const mockBreadcrumbs = ['Engines', 'some-engine', 'Analytics'];

  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValueOnce({ query: 'some-query' });
  });

  it('renders', () => {
    const wrapper = shallow(<QueryDetail breadcrumbs={mockBreadcrumbs} />);

    expect(wrapper.find(SetPageChrome).prop('trail')).toEqual([
      'Engines',
      'some-engine',
      'Analytics',
      'Query',
      'some-query',
    ]);
  });
});
