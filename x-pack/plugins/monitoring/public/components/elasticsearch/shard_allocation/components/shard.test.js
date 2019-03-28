/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Shard } from './shard';

describe('Shard', () => {
  it('should show UNASSIGNED primary shards', () => {
    const props = {
      shard: {
        state: 'UNASSIGNED',
        primary: true,
        shard: 0,
        tooltip_message: 'Unassigned',
        type: 'shard',
        master: true
      }
    };

    const component = shallow(<Shard {...props}/>);
    expect(component).toMatchSnapshot();
  });

  it('should show UNASSIGNED non-primary shards', () => {
    const props = {
      shard: {
        state: 'UNASSIGNED',
        primary: false,
        shard: 0,
        tooltip_message: 'Unassigned',
        type: 'shard',
        master: false
      }
    };

    const component = shallow(<Shard {...props}/>);
    expect(component).toMatchSnapshot();
  });
});
