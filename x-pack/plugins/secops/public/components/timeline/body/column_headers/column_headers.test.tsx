/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { Sort } from '../sort/sort';
import { ColumnHeaders } from './column_headers';
import { headers } from './headers';

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    const sort: Sort = {
      columnId: 'fooColumn',
      sortDirection: 'descending',
    };

    test('it renders the range picker header', () => {
      const wrapper = mount(
        <ColumnHeaders columnHeaders={headers} sort={sort} onRangeSelected={noop} />
      );

      expect(wrapper.find('[data-test-subj="rangePicker"]').props()).toHaveProperty('value');
    });

    test('it renders the other (data-driven) column headers', () => {
      const wrapper = mount(
        <ColumnHeaders columnHeaders={headers} sort={sort} onRangeSelected={noop} />
      );

      headers.forEach(h => {
        expect(wrapper.find('[data-test-subj="columnHeaders"]').text()).toContain(h.text);
      });
    });
  });
});
