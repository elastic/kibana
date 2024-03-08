/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { createMockStore } from '../../../../common/mock';
import '../../../../common/mock/match_media';
import { NetworkKpiComponent } from '.';

describe('NetworkKpiComponent', () => {
  const props = {
    filterQuery: '',
    from: '2019-06-15T06:00:00.000Z',
    indexNames: [],
    updateDateRange: jest.fn(),
    setQuery: jest.fn(),
    skip: true,
    to: '2019-06-18T06:00:00.000Z',
  };

  describe('rendering', () => {
    test('it renders the default widget', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={createMockStore()}>
          <NetworkKpiComponent {...props} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('NetworkKpiComponent')).toMatchSnapshot();
    });
  });
});
