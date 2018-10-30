/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import {
  getDirection,
  SORT_DIRECTION_ASCENDING,
  SORT_DIRECTION_DESCENDING,
  SORT_DIRECTION_NONE,
  SortIndicator,
} from './sort_indicator';

describe('SortIndicator', () => {
  describe('rendering', () => {
    test('it renders the sort indicator', () => {
      const wrapper = mount(<SortIndicator sortDirection="descending" />);

      expect(wrapper.find('[data-test-subj="sortIndicator"]').text()).toEqual(
        SORT_DIRECTION_DESCENDING
      );
    });
  });

  describe('getDirection', () => {
    test('it returns the expected symbol when the direction is ascending', () => {
      expect(getDirection('ascending')).toEqual(SORT_DIRECTION_ASCENDING);
    });

    test('it returns the expected symbol when the direction is descending', () => {
      expect(getDirection('descending')).toEqual(SORT_DIRECTION_DESCENDING);
    });

    test('it returns the expected symbol (an empty string) when the direction is neither ascending, nor descending', () => {
      expect(getDirection('none')).toEqual(SORT_DIRECTION_NONE);
    });
  });
});
