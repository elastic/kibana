/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { ColumnHeaders } from '.';
import { Direction } from '../../../../graphql/types';
import { ACTIONS_COLUMN_WIDTH } from '../helpers';
import { Sort } from '../sort';
import { defaultHeaders } from './headers';

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    const sort: Sort = {
      columnId: 'fooColumn',
      sortDirection: Direction.descending,
    };

    test('it renders the other (data-driven) column headers', () => {
      const wrapper = mount(
        <ColumnHeaders
          actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
          columnHeaders={defaultHeaders}
          sort={sort}
          timelineId={'test'}
        />
      );

      defaultHeaders.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="column-headers"]')
            .first()
            .text()
        ).toContain(h.text);
      });
    });
  });
});
