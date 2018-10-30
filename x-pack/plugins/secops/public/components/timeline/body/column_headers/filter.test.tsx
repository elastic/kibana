/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { ColumnHeader } from './column_header';
import { Filter } from './filter';

describe('Filter', () => {
  describe('rendering', () => {
    test('it renders a text filter when the columnHeaderType is "text-filter"', () => {
      const columnHeader: ColumnHeader = {
        columnHeaderType: 'text-filter',
        id: 'foobar',
        minWidth: 100,
        text: 'Foobar',
      };

      const wrapper = mount(<Filter header={columnHeader} />);

      expect(wrapper.find('[data-test-subj="textFilter"]').props()).toHaveProperty('placeholder');
    });

    test('it does NOT render a filter when the columnHeaderType is "not-filtered"', () => {
      const notFilteredHeader: ColumnHeader = {
        columnHeaderType: 'not-filtered',
        id: 'foobar',
        minWidth: 100,
        text: 'Foobar',
      };

      const wrapper = mount(<Filter header={notFilteredHeader} />);

      expect(wrapper.find('[data-test-subj="textFilter"]').length).toEqual(0);
    });
  });
});
