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
  let beats: CMPopulatedBeat[];
  let onBulkAction: any;

  beforeEach(() => {
    beats = [
      {
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
      },
      {
        id: 'beatid2',
        access_token: 'access',
        type: 'Filebeat v6.3.2',
        host_ip: '192.168.1.0',
        host_name: 'name',
        full_tags: [
          {
            id: 'Production',
            configuration_blocks: [],
          },
        ],
      },
    ];
    onBulkAction = jest.fn();
  });

  it('matches snapshot', () => {
    const wrapper = shallow(<BeatsTable beats={beats} onBulkAction={onBulkAction} />);

    expect(wrapper).toMatchSnapshot();
  });
});
