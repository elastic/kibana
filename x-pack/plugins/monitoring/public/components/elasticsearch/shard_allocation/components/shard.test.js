/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Shard } from './shard';

describe('Shard', () => {
  it('should show unassigned primary shards', () => {
    const props = {
      shard: {
        state: 'UNASSIGNED',
        primary: true,
        shard: 0,
        tooltip_message: 'Unassigned',
        type: 'shard',
        master: true,
      },
    };

    const component = shallow(<Shard {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('should show unassigned replica shards', () => {
    const props = {
      shard: {
        state: 'UNASSIGNED',
        primary: false,
        shard: 0,
        tooltip_message: 'Unassigned',
        type: 'shard',
        master: false,
      },
    };

    const component = shallow(<Shard {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('should show for assigned primary shards', () => {
    const props = {
      shard: {
        state: 'STARTED',
        primary: true,
        shard: 0,
        tooltip_message: 'Started',
        type: 'shard',
        master: true,
      },
    };

    const component = shallow(<Shard {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('should show for assigned replica shards', () => {
    const props = {
      shard: {
        state: 'STARTED',
        primary: false,
        shard: 0,
        tooltip_message: 'Started',
        type: 'shard',
        master: true,
      },
    };

    const component = shallow(<Shard {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('should show for relocating shards', () => {
    const props = {
      shard: {
        state: 'RELOCATING',
        primary: true,
        shard: 0,
        tooltip_message: 'Relocating',
        type: 'shard',
        master: true,
      },
    };

    const component = shallow(<Shard {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('should show for initializing shards', () => {
    const props = {
      shard: {
        state: 'INITIALIZING',
        primary: true,
        shard: 0,
        tooltip_message: 'Initializing',
        type: 'shard',
        master: true,
      },
    };

    const component = shallow(<Shard {...props} />);
    expect(component).toMatchSnapshot();
  });
});
