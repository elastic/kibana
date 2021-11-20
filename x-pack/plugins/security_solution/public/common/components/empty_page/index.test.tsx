/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { EmptyPage } from './index';

describe('EmptyPage component', () => {
  it('renders actions without descriptions', () => {
    const actions = {
      actions: {
        label: 'Do Something',
        url: 'my/url/from/nowwhere',
      },
    };
    const EmptyComponent = shallow(<EmptyPage actions={actions} title="My Super Title" />);
    expect(EmptyComponent).toMatchSnapshot();
  });

  it('renders actions with descriptions', () => {
    const actions = {
      actions: {
        description: 'My Description',
        label: 'Do Something',
        url: 'my/url/from/nowwhere',
      },
    };
    const EmptyComponent = shallow(<EmptyPage actions={actions} title="My Super Title" />);
    expect(EmptyComponent).toMatchSnapshot();
  });
});
