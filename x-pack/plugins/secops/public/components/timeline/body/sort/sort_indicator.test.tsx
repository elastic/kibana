/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { getDirection, SortIndicator } from './sort_indicator';

describe('SortIndicator', () => {
  describe('rendering', () => {
    test('it renders the sort indicator', () => {
      const wrapper = mount(<SortIndicator sortDirection="descending" />);

      expect(
        wrapper
          .find('[data-test-subj="sortIndicator"]')
          .first()
          .prop('type')
      ).toEqual('sortDown');
    });
  });

  describe('getDirection', () => {
    test('it returns the expected symbol when the direction is ascending', () => {
      expect(getDirection('ascending')).toEqual('sortUp');
    });

    test('it returns the expected symbol when the direction is descending', () => {
      expect(getDirection('descending')).toEqual('sortDown');
    });

    test('it returns the expected symbol (undefined) when the direction is neither ascending, nor descending', () => {
      expect(getDirection('none')).toEqual(undefined);
    });
  });
});
