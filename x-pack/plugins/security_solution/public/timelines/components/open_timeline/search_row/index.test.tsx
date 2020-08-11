/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButtonProps } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';

import { SearchRow } from '.';

import * as i18n from '../translations';

describe('SearchRow', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('it renders a search input with the expected placeholder when the query is empty', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          timelineType={TimelineType.default}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('input').first().props()).toHaveProperty(
      'placeholder',
      i18n.SEARCH_PLACEHOLDER
    );
  });

  describe('Only Favorites Button', () => {
    test('it renders the expected button text', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
            query=""
            timelineType={TimelineType.default}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="only-favorites-toggle"]').first().text()).toEqual(
        i18n.ONLY_FAVORITES
      );
    });

    test('it invokes onToggleOnlyFavorites when clicked', () => {
      const onToggleOnlyFavorites = jest.fn();

      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={onToggleOnlyFavorites}
            query=""
            timelineType={TimelineType.default}
          />
        </ThemeProvider>
      );

      wrapper.find('[data-test-subj="only-favorites-toggle"]').first().simulate('click');

      expect(onToggleOnlyFavorites).toHaveBeenCalled();
    });

    test('it sets the button to the toggled state when onlyFavorites is true', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={true}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
            query=""
            timelineType={TimelineType.default}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .props() as EuiFilterButtonProps;

      expect(props.hasActiveFilters).toBe(true);
    });

    test('it sets the button to the NON-toggled state when onlyFavorites is false', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
            query=""
            timelineType={TimelineType.default}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .props() as EuiFilterButtonProps;

      expect(props.hasActiveFilters).toBe(false);
    });
  });

  describe('#onQueryChange', () => {
    const onQueryChange = jest.fn();

    test('it invokes onQueryChange when the user enters a query', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            onQueryChange={onQueryChange}
            onToggleOnlyFavorites={jest.fn()}
            query=""
            timelineType={TimelineType.default}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { key: 'Enter', target: { value: 'abcd' } });

      expect(onQueryChange).toHaveBeenCalled();
    });
  });
});
