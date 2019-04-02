/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { Direction } from '../../../graphql/types';
import { mockIndexPattern } from '../../../mock';
import { TestProviders } from '../../../mock/test_providers';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';

import { TimelineHeader } from '.';

describe('Header', () => {
  const indexPattern = mockIndexPattern;

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TimelineHeader
          id="foo"
          indexPattern={indexPattern}
          dataProviders={mockDataProviders}
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          show={true}
          sort={{
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          }}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeader
            id="foo"
            indexPattern={indexPattern}
            dataProviders={mockDataProviders}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
            sort={{
              columnId: '@timestamp',
              sortDirection: Direction.desc,
            }}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });
  });
});
