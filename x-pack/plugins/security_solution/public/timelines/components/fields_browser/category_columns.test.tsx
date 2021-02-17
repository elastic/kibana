/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../../common/containers/source/mock';

import { CATEGORY_PANE_WIDTH, getFieldCount } from './helpers';
import { CategoriesPane } from './categories_pane';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

const timelineId = 'test';
const theme = () => ({ eui: euiDarkVars, darkMode: true });

describe('getCategoryColumns', () => {
  Object.keys(mockBrowserFields).forEach((categoryId) => {
    test(`it renders the ${categoryId} category name (from filteredBrowserFields)`, () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <CategoriesPane
            filteredBrowserFields={mockBrowserFields}
            width={CATEGORY_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            selectedCategoryId={''}
            timelineId={timelineId}
          />
        </ThemeProvider>
      );

      const fieldCount = Object.keys(mockBrowserFields[categoryId].fields ?? {}).length;

      expect(
        wrapper.find(`.field-browser-category-pane-${categoryId}-${timelineId}`).first().text()
      ).toEqual(`${categoryId}${fieldCount}`);
    });
  });

  Object.keys(mockBrowserFields).forEach((categoryId) => {
    test(`it renders the correct field count for the ${categoryId} category (from filteredBrowserFields)`, () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <CategoriesPane
            filteredBrowserFields={mockBrowserFields}
            width={CATEGORY_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            selectedCategoryId={''}
            timelineId={timelineId}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find(`[data-test-subj="${categoryId}-category-count"]`).first().text()
      ).toEqual(`${getFieldCount(mockBrowserFields[categoryId])}`);
    });
  });

  test('it renders the selected category with bold text', () => {
    const selectedCategoryId = 'auditd';

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <CategoriesPane
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`.field-browser-category-pane-${selectedCategoryId}-${timelineId}`)
        .find('[data-test-subj="categoryName"]')
        .at(1)
    ).toHaveStyleRule('font-weight', 'bold', { modifier: '.euiText' });
  });

  test('it does NOT render an un-selected category with bold text', () => {
    const selectedCategoryId = 'auditd';
    const notTheSelectedCategoryId = 'base';

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <CategoriesPane
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find(`.field-browser-category-pane-${notTheSelectedCategoryId}-${timelineId}`)
        .find('[data-test-subj="categoryName"]')
        .at(1)
    ).toHaveStyleRule('font-weight', 'normal', { modifier: '.euiText' });
  });

  test('it invokes onCategorySelected when a user clicks a category', () => {
    const selectedCategoryId = 'auditd';
    const notTheSelectedCategoryId = 'base';

    const onCategorySelected = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <CategoriesPane
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={onCategorySelected}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
        />
      </ThemeProvider>
    );

    wrapper
      .find(`.field-browser-category-pane-${notTheSelectedCategoryId}-${timelineId}`)
      .first()
      .simulate('click');

    expect(onCategorySelected).toHaveBeenCalledWith(notTheSelectedCategoryId);
  });
});
