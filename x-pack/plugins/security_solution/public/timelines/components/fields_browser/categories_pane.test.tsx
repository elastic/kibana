/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

import { mockBrowserFields } from '../../../common/containers/source/mock';

import { CATEGORY_PANE_WIDTH } from './helpers';
import { CategoriesPane } from './categories_pane';
import * as i18n from './translations';

const timelineId = 'test';

describe('CategoriesPane', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  test('it renders the expected title', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="categories-pane-title"]').first().text()).toEqual(
      i18n.CATEGORIES
    );
  });

  test('it renders a "No fields match" message when filteredBrowserFields is empty', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={{}}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="categories-container"] tbody').first().text()).toEqual(
      i18n.NO_FIELDS_MATCH
    );
  });
});
