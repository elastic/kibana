/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import sinon from 'sinon';

import { AutocompleteSuggestionType } from '../suggestions';
import props from './props.json';
import { CodeQueryBar } from './query_bar';

test('render correctly with empty query string', () => {
  const emptyFn = () => {
    return;
  };
  const queryBarComp = mount(
    <CodeQueryBar
      repositorySearch={emptyFn}
      saveSearchOptions={emptyFn}
      repoSearchResults={[]}
      searchLoading={false}
      searchOptions={{ repoScopes: [] }}
      query=""
      disableAutoFocus={false}
      appName="mockapp"
      suggestionProviders={[]}
      onSubmit={emptyFn}
      onSelect={emptyFn}
    />
  );
  expect(toJson(queryBarComp)).toMatchSnapshot();
});

test('render correctly with input query string changed', done => {
  const emptyFn = () => {
    return;
  };

  const emptyAsyncFn = (query: string): Promise<any> => {
    return Promise.resolve();
  };

  const fileSuggestionsSpy = sinon.fake.returns(
    Promise.resolve(props[AutocompleteSuggestionType.FILE])
  );
  const symbolSuggestionsSpy = sinon.fake.returns(
    Promise.resolve(props[AutocompleteSuggestionType.SYMBOL])
  );
  const repoSuggestionsSpy = sinon.fake.returns(
    Promise.resolve(props[AutocompleteSuggestionType.REPOSITORY])
  );

  const mockFileSuggestionsProvider = {
    getSuggestions: emptyAsyncFn,
  };
  mockFileSuggestionsProvider.getSuggestions = fileSuggestionsSpy;
  const mockSymbolSuggestionsProvider = {
    getSuggestions: emptyAsyncFn,
  };
  mockSymbolSuggestionsProvider.getSuggestions = symbolSuggestionsSpy;
  const mockRepositorySuggestionsProvider = {
    getSuggestions: emptyAsyncFn,
  };
  mockRepositorySuggestionsProvider.getSuggestions = repoSuggestionsSpy;

  const submitSpy = sinon.spy();

  const queryBarComp = mount(
    <MemoryRouter initialEntries={[{ pathname: '/', key: 'testKey' }]}>
      <CodeQueryBar
        repositorySearch={emptyFn}
        saveSearchOptions={emptyFn}
        repoSearchResults={[]}
        searchLoading={false}
        searchOptions={{ repoScopes: [] }}
        query=""
        disableAutoFocus={false}
        appName="mockapp"
        suggestionProviders={[
          mockFileSuggestionsProvider,
          mockSymbolSuggestionsProvider,
          mockRepositorySuggestionsProvider,
        ]}
        onSubmit={submitSpy}
        onSelect={emptyFn}
      />
    </MemoryRouter>
  );

  // Input 'mockquery' in the query bar.
  queryBarComp.find('input').simulate('change', { target: { value: 'mockquery' } });

  // Wait for 101ms to make sure the getSuggestions has been triggered.
  setTimeout(() => {
    expect(toJson(queryBarComp)).toMatchSnapshot();
    expect(fileSuggestionsSpy.calledOnce).toBeTruthy();
    expect(symbolSuggestionsSpy.calledOnce).toBeTruthy();
    expect(repoSuggestionsSpy.calledOnce).toBeTruthy();

    // Hit enter
    queryBarComp.find('input').simulate('keyDown', { keyCode: 13, key: 'Enter', metaKey: true });
    expect(submitSpy.calledOnce).toBeTruthy();

    done();
  }, 101);
});
