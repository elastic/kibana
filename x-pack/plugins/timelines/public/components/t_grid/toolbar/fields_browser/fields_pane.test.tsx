/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useMountAppended } from '../../../utils/use_mount_appended';
import { mockBrowserFields, TestProviders } from '../../../../mock';

import { FIELDS_PANE_WIDTH } from './helpers';
import { FieldsPane } from './fields_pane';

const timelineId = 'test';

describe('FieldsPane', () => {
  const mount = useMountAppended();

  test('it renders the selected category', () => {
    const selectedCategory = 'auditd';

    const wrapper = mount(
      <TestProviders>
        <FieldsPane
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          selectedCategoryId={selectedCategory}
          timelineId={timelineId}
          width={FIELDS_PANE_WIDTH}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="selected-category-title"]`).first().text()).toEqual(
      selectedCategory
    );
  });

  test('it renders a unknown category that does not exist in filteredBrowserFields', () => {
    const selectedCategory = 'unknown';

    const wrapper = mount(
      <TestProviders>
        <FieldsPane
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          selectedCategoryId={selectedCategory}
          timelineId={timelineId}
          width={FIELDS_PANE_WIDTH}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="selected-category-title"]`).first().text()).toEqual(
      selectedCategory
    );
  });

  test('it renders the expected message when `filteredBrowserFields` is empty and `searchInput` is empty', () => {
    const searchInput = '';

    const wrapper = mount(
      <TestProviders>
        <FieldsPane
          columnHeaders={[]}
          filteredBrowserFields={{}}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput={searchInput}
          selectedCategoryId=""
          timelineId={timelineId}
          width={FIELDS_PANE_WIDTH}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="no-fields-match"]`).first().text()).toEqual(
      'No fields match '
    );
  });

  test('it renders the expected message when `filteredBrowserFields` is empty and `searchInput` is an unknown field name', () => {
    const searchInput = 'thisFieldDoesNotExist';

    const wrapper = mount(
      <TestProviders>
        <FieldsPane
          columnHeaders={[]}
          filteredBrowserFields={{}}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput={searchInput}
          selectedCategoryId=""
          timelineId={timelineId}
          width={FIELDS_PANE_WIDTH}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="no-fields-match"]`).first().text()).toEqual(
      `No fields match ${searchInput}`
    );
  });
});
