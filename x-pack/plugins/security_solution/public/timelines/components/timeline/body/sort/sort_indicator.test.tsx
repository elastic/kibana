/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { Direction } from '../../../../../graphql/types';
import * as i18n from '../translations';

import { getDirection, SortIndicator } from './sort_indicator';

describe('SortIndicator', () => {
  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<SortIndicator sortDirection={Direction.desc} />);
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the expected sort indicator when direction is ascending', () => {
      const wrapper = mount(<SortIndicator sortDirection={Direction.asc} />);

      expect(wrapper.find('[data-test-subj="sortIndicator"]').first().prop('type')).toEqual(
        'sortUp'
      );
    });

    test('it renders the expected sort indicator when direction is descending', () => {
      const wrapper = mount(<SortIndicator sortDirection={Direction.desc} />);

      expect(wrapper.find('[data-test-subj="sortIndicator"]').first().prop('type')).toEqual(
        'sortDown'
      );
    });

    test('it renders the expected sort indicator when direction is `none`', () => {
      const wrapper = mount(<SortIndicator sortDirection="none" />);

      expect(wrapper.find('[data-test-subj="sortIndicator"]').first().prop('type')).toEqual(
        'empty'
      );
    });
  });

  describe('getDirection', () => {
    test('it returns the expected symbol when the direction is ascending', () => {
      expect(getDirection(Direction.asc)).toEqual('sortUp');
    });

    test('it returns the expected symbol when the direction is descending', () => {
      expect(getDirection(Direction.desc)).toEqual('sortDown');
    });

    test('it returns the expected symbol (undefined) when the direction is neither ascending, nor descending', () => {
      expect(getDirection('none')).toEqual(undefined);
    });
  });

  describe('sort indicator tooltip', () => {
    test('it returns the expected tooltip when the direction is ascending', () => {
      const wrapper = mount(<SortIndicator sortDirection={Direction.asc} />);

      expect(
        wrapper.find('[data-test-subj="sort-indicator-tooltip"]').first().props().content
      ).toEqual(i18n.SORTED_ASCENDING);
    });

    test('it returns the expected tooltip when the direction is descending', () => {
      const wrapper = mount(<SortIndicator sortDirection={Direction.desc} />);

      expect(
        wrapper.find('[data-test-subj="sort-indicator-tooltip"]').first().props().content
      ).toEqual(i18n.SORTED_DESCENDING);
    });

    test('it does NOT render a tooltip when sort direction is `none`', () => {
      const wrapper = mount(<SortIndicator sortDirection="none" />);

      expect(wrapper.find('[data-test-subj="sort-indicator-tooltip"]').exists()).toBe(false);
    });
  });
});
