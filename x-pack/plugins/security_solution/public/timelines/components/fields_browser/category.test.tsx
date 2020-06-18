/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockBrowserFields } from '../../../common/containers/source/mock';

import { Category } from './category';
import { getFieldItems } from './field_items';
import { FIELDS_PANE_WIDTH } from './helpers';
import { TestProviders } from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';

import * as i18n from './translations';

describe('Category', () => {
  const timelineId = 'test';
  const selectedCategoryId = 'client';
  const mount = useMountAppended();

  test('it renders the category id as the value of the title', () => {
    const wrapper = mount(
      <TestProviders>
        <Category
          categoryId={selectedCategoryId}
          data-test-subj="category"
          filteredBrowserFields={mockBrowserFields}
          fieldItems={getFieldItems({
            browserFields: mockBrowserFields,
            category: mockBrowserFields[selectedCategoryId],
            categoryId: selectedCategoryId,
            columnHeaders: [],
            highlight: '',
            onUpdateColumns: jest.fn(),
            timelineId,
            toggleColumn: jest.fn(),
          })}
          width={FIELDS_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="selected-category-title"]').first().text()).toEqual(
      selectedCategoryId
    );
  });

  test('it renders the Field column header', () => {
    const wrapper = mount(
      <TestProviders>
        <Category
          categoryId={selectedCategoryId}
          data-test-subj="category"
          filteredBrowserFields={mockBrowserFields}
          fieldItems={getFieldItems({
            browserFields: mockBrowserFields,
            category: mockBrowserFields[selectedCategoryId],
            categoryId: selectedCategoryId,
            columnHeaders: [],
            highlight: '',
            onUpdateColumns: jest.fn(),
            timelineId,
            toggleColumn: jest.fn(),
          })}
          width={FIELDS_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('.euiTableCellContent__text').at(0).text()).toEqual(i18n.FIELD);
  });

  test('it renders the Description column header', () => {
    const wrapper = mount(
      <TestProviders>
        <Category
          categoryId={selectedCategoryId}
          data-test-subj="category"
          filteredBrowserFields={mockBrowserFields}
          fieldItems={getFieldItems({
            browserFields: mockBrowserFields,
            category: mockBrowserFields[selectedCategoryId],
            categoryId: selectedCategoryId,
            columnHeaders: [],
            highlight: '',
            onUpdateColumns: jest.fn(),
            timelineId,
            toggleColumn: jest.fn(),
          })}
          width={FIELDS_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('.euiTableCellContent__text').at(1).text()).toEqual(i18n.DESCRIPTION);
  });
});
