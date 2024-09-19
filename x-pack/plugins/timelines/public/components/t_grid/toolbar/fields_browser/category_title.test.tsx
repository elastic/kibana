/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields, TestProviders } from '../../../../mock';

import { CategoryTitle } from './category_title';
import { getFieldCount } from './helpers';

describe('CategoryTitle', () => {
  const timelineId = 'test';

  test('it renders the category id as the value of the title', () => {
    const categoryId = 'client';
    const wrapper = mount(
      <TestProviders>
        <CategoryTitle
          categoryId={categoryId}
          filteredBrowserFields={mockBrowserFields}
          onUpdateColumns={jest.fn()}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="selected-category-title"]').first().text()).toEqual(
      categoryId
    );
  });

  test('when `categoryId` specifies a valid category in `filteredBrowserFields`, a count of the field is displayed in the badge', () => {
    const validCategoryId = 'client';
    const wrapper = mount(
      <TestProviders>
        <CategoryTitle
          categoryId={validCategoryId}
          filteredBrowserFields={mockBrowserFields}
          onUpdateColumns={jest.fn()}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="selected-category-count-badge"]`).first().text()).toEqual(
      `${getFieldCount(mockBrowserFields[validCategoryId])}`
    );
  });

  test('when `categoryId` specifies an INVALID category in `filteredBrowserFields`, a count of zero is displayed in the badge', () => {
    const invalidCategoryId = 'this.is.not.happening';
    const wrapper = mount(
      <TestProviders>
        <CategoryTitle
          categoryId={invalidCategoryId}
          filteredBrowserFields={mockBrowserFields}
          onUpdateColumns={jest.fn()}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="selected-category-count-badge"]`).first().text()).toEqual(
      '0'
    );
  });
});
