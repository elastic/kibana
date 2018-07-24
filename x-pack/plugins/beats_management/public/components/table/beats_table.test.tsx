/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { BeatsTable } from './beats_table';

describe('BeatsTable component', () => {
  let items: CMPopulatedBeat[];
  let beat;
  let onBulkAction: any;

  beforeEach(() => {
    beat = {
      id: 'beatid',
      access_token: 'access',
      type: 'type',
      host_ip: 'ip',
      host_name: 'name',
      full_tags: [
        {
          id: 'Production',
          configuration_blocks: [],
        },
      ],
    };
    items = [beat];
    onBulkAction = jest.fn();
  });

  it('matches snapshot', () => {
    const wrapper = shallow(<BeatsTable items={items} onBulkAction={onBulkAction} />);
    expect(wrapper).toMatchSnapshot();
  });
});
