/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldSearch } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';

import { ThemeProvider } from 'styled-components';

import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import { AutocompleteField } from '.';

const mockAutoCompleteData: AutocompleteSuggestion[] = [
  {
    type: 'field',
    text: 'agent.ephemeral_id ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.ephemeral_id</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.hostname ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.hostname</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.id ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.id</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.name ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.name</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.type ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.type</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.version ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.version</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.test1 ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.test1</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.test2 ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.test2</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.test3 ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.test3</span></p>',
    start: 0,
    end: 1,
  },
  {
    type: 'field',
    text: 'agent.test4 ',
    description:
      '<p>Filter results that contain <span class="suggestionItem__callout">agent.test4</span></p>',
    start: 0,
    end: 1,
  },
];

describe('Autocomplete', () => {
  describe('rendering', () => {
    test('it is rendering with placeholder', () => {
      const placeholder = 'myPlaceholder';

      const wrapper = mount(
        <AutocompleteField
          isLoadingSuggestions={false}
          isValid={false}
          loadSuggestions={noop}
          onChange={noop}
          onSubmit={noop}
          placeholder={placeholder}
          suggestions={[]}
          value={''}
        />
      );
      const input = wrapper.find('input[type="search"]');
      expect(input.find('[placeholder]').props().placeholder).toEqual(placeholder);
    });

    test('Rendering suggested items', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <AutocompleteField
            isLoadingSuggestions={false}
            isValid={false}
            loadSuggestions={noop}
            onChange={noop}
            onSubmit={noop}
            placeholder=""
            suggestions={mockAutoCompleteData}
            value={''}
          />
        </ThemeProvider>
      );
      const wrapperAutocompleteField = wrapper.find(AutocompleteField);
      wrapperAutocompleteField.setState({ areSuggestionsVisible: true });
      wrapper.update();

      expect(wrapper.find('.euiPanel div[data-test-subj="suggestion-item"]').length).toEqual(10);
    });

    test('Should Not render suggested items if loading new suggestions', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <AutocompleteField
            isLoadingSuggestions={true}
            isValid={false}
            loadSuggestions={noop}
            onChange={noop}
            onSubmit={noop}
            placeholder=""
            suggestions={mockAutoCompleteData}
            value={''}
          />
        </ThemeProvider>
      );
      const wrapperAutocompleteField = wrapper.find(AutocompleteField);
      wrapperAutocompleteField.setState({ areSuggestionsVisible: true });
      wrapper.update();

      expect(wrapper.find('.euiPanel div[data-test-subj="suggestion-item"]').length).toEqual(0);
    });
  });

  describe('events', () => {
    test('OnChange should have been called', () => {
      const onChange = jest.fn((evt: React.ChangeEvent<HTMLInputElement>) => evt);

      const wrapper = mount(
        <AutocompleteField
          isLoadingSuggestions={false}
          isValid={false}
          loadSuggestions={noop}
          onChange={onChange}
          onSubmit={noop}
          placeholder=""
          suggestions={[]}
          value={''}
        />
      );
      const wrapperFixedEuiFieldSearch = wrapper.find(EuiFieldSearch);
      wrapperFixedEuiFieldSearch.props().onChange({ currentTarget: { value: test } });
      expect(onChange).toHaveBeenCalled();
    });
  });

  test('OnSubmit should have been called by keying enter on the search input', () => {
    const onSubmit = jest.fn((evt: React.ChangeEvent<HTMLInputElement>) => evt);

    const wrapper = mount(
      <AutocompleteField
        isLoadingSuggestions={false}
        isValid={true}
        loadSuggestions={noop}
        onChange={noop}
        onSubmit={onSubmit}
        placeholder=""
        suggestions={mockAutoCompleteData}
        value={'filter: query'}
      />
    );
    const wrapperAutocompleteField = wrapper.find(AutocompleteField);
    wrapperAutocompleteField.setState({ selectedIndex: null });
    const wrapperFixedEuiFieldSearch = wrapper.find(EuiFieldSearch);
    wrapperFixedEuiFieldSearch.props().onKeyDown({ key: 'Enter', preventDefault: noop });
    expect(onSubmit).toHaveBeenCalled();
  });

  test('OnSubmit should have been called by onSearch event on the input', () => {
    const onSubmit = jest.fn((evt: React.ChangeEvent<HTMLInputElement>) => evt);

    const wrapper = mount(
      <AutocompleteField
        isLoadingSuggestions={false}
        isValid={true}
        loadSuggestions={noop}
        onChange={noop}
        onSubmit={onSubmit}
        placeholder=""
        suggestions={mockAutoCompleteData}
        value={'filter: query'}
      />
    );
    const wrapperAutocompleteField = wrapper.find(AutocompleteField);
    wrapperAutocompleteField.setState({ selectedIndex: null });
    const wrapperFixedEuiFieldSearch = wrapper.find(EuiFieldSearch);
    wrapperFixedEuiFieldSearch.props().onSearch();
    expect(onSubmit).toHaveBeenCalled();
  });

  test('OnChange should have been called if keying enter on a suggested item selected', () => {
    const onChange = jest.fn((evt: React.ChangeEvent<HTMLInputElement>) => evt);

    const wrapper = mount(
      <AutocompleteField
        isLoadingSuggestions={false}
        isValid={false}
        loadSuggestions={noop}
        onChange={onChange}
        onSubmit={noop}
        placeholder=""
        suggestions={mockAutoCompleteData}
        value={''}
      />
    );
    const wrapperAutocompleteField = wrapper.find(AutocompleteField);
    wrapperAutocompleteField.setState({ selectedIndex: 1 });
    const wrapperFixedEuiFieldSearch = wrapper.find(EuiFieldSearch);
    wrapperFixedEuiFieldSearch.props().onKeyDown({ key: 'Enter', preventDefault: noop });
    expect(onChange).toHaveBeenCalled();
  });

  test('Load more suggestions when arrowdown on the search bar', () => {
    const loadSuggestions = jest.fn(noop);

    const wrapper = mount(
      <AutocompleteField
        isLoadingSuggestions={false}
        isValid={false}
        loadSuggestions={loadSuggestions}
        onChange={noop}
        onSubmit={noop}
        placeholder=""
        suggestions={[]}
        value={''}
      />
    );
    const wrapperFixedEuiFieldSearch = wrapper.find(EuiFieldSearch);
    wrapperFixedEuiFieldSearch.props().onKeyDown({ key: 'ArrowDown', preventDefault: noop });
    expect(loadSuggestions).toHaveBeenCalled();
  });
});
