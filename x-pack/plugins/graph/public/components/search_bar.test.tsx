/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test/jest';
import { SearchBar, SearchBarProps } from './search_bar';
import React, { Component, ReactElement } from 'react';
import { CoreStart } from 'src/core/public';
import { act } from 'react-dom/test-utils';
import { IndexPattern, QueryStringInput } from '../../../../../src/plugins/data/public';

import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { I18nProvider, InjectedIntl } from '@kbn/i18n-react';

import { openSourceModal } from '../services/source_modal';

import { GraphStore, setDatasource, submitSearchSaga } from '../state_management';
import { ReactWrapper } from 'enzyme';
import { createMockGraphStore } from '../state_management/mocks';
import { Provider } from 'react-redux';

jest.mock('../services/source_modal', () => ({ openSourceModal: jest.fn() }));

const waitForIndexPatternFetch = () => new Promise((r) => setTimeout(r));

function wrapSearchBarInContext(testProps: SearchBarProps) {
  const services = {
    uiSettings: {
      get: (key: string) => {
        return 10;
      },
    } as CoreStart['uiSettings'],
    savedObjects: {} as CoreStart['savedObjects'],
    notifications: {} as CoreStart['notifications'],
    docLinks: {
      links: {
        query: {
          kueryQuerySyntax: '',
        },
      },
    } as CoreStart['docLinks'],
    http: {} as CoreStart['http'],
    overlays: {} as CoreStart['overlays'],
    storage: {
      get: () => {},
    },
    data: {
      query: {
        savedQueries: {},
      },
      autocomplete: {
        hasQuerySuggestions: () => false,
      },
    },
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <SearchBar {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('search_bar', () => {
  let dispatchSpy: jest.Mock;
  let instance: ReactWrapper<
    SearchBarProps & { intl: InjectedIntl },
    Readonly<{}>,
    Component<{}, {}, any>
  >;
  let store: GraphStore;
  const defaultProps = {
    isLoading: false,
    indexPatternProvider: {
      get: jest.fn(() => Promise.resolve({ fields: [] } as unknown as IndexPattern)),
    },
    confirmWipeWorkspace: (callback: () => void) => {
      callback();
    },
    onIndexPatternChange: (indexPattern?: IndexPattern) => {
      instance.setProps({
        ...defaultProps,
        currentIndexPattern: indexPattern,
      });
    },
  };

  beforeEach(() => {
    store = createMockGraphStore({
      sagas: [submitSearchSaga],
    }).store;

    store.dispatch(
      setDatasource({
        type: 'indexpattern',
        id: '123',
        title: 'test-index',
      })
    );

    dispatchSpy = jest.fn(store.dispatch);
    store.dispatch = dispatchSpy;
  });

  async function mountSearchBar() {
    jest.clearAllMocks();
    const searchBarTestRoot = React.createElement((updatedProps: SearchBarProps) => (
      <Provider store={store}>
        {wrapSearchBarInContext({ ...defaultProps, ...updatedProps })}
      </Provider>
    ));

    await act(async () => {
      instance = mountWithIntl(searchBarTestRoot);
    });
  }

  it('should render search bar and fetch index pattern', async () => {
    await mountSearchBar();

    expect(defaultProps.indexPatternProvider.get).toHaveBeenCalledWith('123');
  });

  it('should render search bar and submit queries', async () => {
    await mountSearchBar();

    await waitForIndexPatternFetch();

    act(() => {
      instance.find(QueryStringInput).prop('onChange')!({ language: 'lucene', query: 'testQuery' });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'x-pack/graph/workspace/SUBMIT_SEARCH',
      payload: 'testQuery',
    });
  });

  it('should translate kql query into JSON dsl', async () => {
    await mountSearchBar();

    await waitForIndexPatternFetch();

    act(() => {
      instance.find(QueryStringInput).prop('onChange')!({ language: 'kuery', query: 'test: abc' });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    const parsedQuery = JSON.parse(dispatchSpy.mock.calls[0][0].payload);
    expect(parsedQuery).toEqual({
      bool: { should: [{ match: { test: 'abc' } }], minimum_should_match: 1 },
    });
  });

  it('should open index pattern picker', async () => {
    await mountSearchBar();

    // pick the button component out of the tree because
    // it's part of a popover and thus not covered by enzyme
    (
      instance.find(QueryStringInput).prop('prepend') as ReactElement
    ).props.children.props.onClick();

    expect(openSourceModal).toHaveBeenCalled();
  });
});
