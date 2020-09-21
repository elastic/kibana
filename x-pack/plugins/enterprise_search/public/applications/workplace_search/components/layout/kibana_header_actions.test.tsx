/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';
import { ExternalUrl } from '../../../shared/enterprise_search_url';

import { WorkplaceSearchHeaderActions } from './';

describe('WorkplaceSearchHeaderActions', () => {
  const externalUrl = new ExternalUrl('http://localhost:3002');

  it('renders a link to the search application', () => {
    const wrapper = shallow(<WorkplaceSearchHeaderActions externalUrl={externalUrl} />);

    expect(wrapper.find(EuiButtonEmpty).prop('href')).toEqual('http://localhost:3002/ws/search');
  });

  it('does not render without an Enterprise Search host URL set', () => {
    const wrapper = shallow(<WorkplaceSearchHeaderActions externalUrl={{} as any} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
