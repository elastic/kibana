/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ExpandedCellValueActions } from './expanded_cell_value_actions';

jest.mock('../kibana');

describe('ExpandedCellValueActions', () => {
  const props = {
    browserFields: {
      host: {
        fields: {
          'host.name': {
            aggregatable: true,
            category: 'host',
            description:
              'Name of the host. It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
            type: 'string',
            name: 'host.name',
          },
        },
      },
    },
    field: 'host.name',
    globalFilters: [],
    onFilterAdded: () => {},
    timelineId: 'mockTimelineId',
    value: ['mock value'],
  };
  const wrapper = shallow(<ExpandedCellValueActions {...props} />);

  test('renders show topN button', () => {
    expect(wrapper.find('[data-test-subj="data-grid-expanded-show-top-n"]').exists()).toBeTruthy();
  });

  test('renders filter in button', () => {
    expect(wrapper.find('EuiFlexItem').first().html()).toContain('Filter button');
  });

  test('renders filter out button', () => {
    expect(wrapper.find('EuiFlexItem').last().html()).toContain('Filter out button');
  });
});
