/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { ColumnHeaders } from '.';
import { Sort } from '../sort';
import { headers } from './headers';

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    const sort: Sort = {
      columnId: 'fooColumn',
      sortDirection: 'descending',
    };

    test('it renders the other (data-driven) column headers', () => {
      const wrapper = mount(
        <ColumnHeaders columnHeaders={headers} range="1 Day" sort={sort} onRangeSelected={noop} />
      );

      headers.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="columnHeaders"]')
            .first()
            .text()
        ).toContain(h.text);
      });
    });
  });
});
