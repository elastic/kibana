/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Router } from 'react-router-dom';
import { MockedProvider } from 'react-apollo/test-utils';
import { StaticIndexPattern } from 'ui/index_patterns';

import { UrlStateContainer, UrlStateContainerLifecycle } from './';
import { UrlStateContainerPropTypes } from './types';
import {
  defaultProps,
  getMockPropsObj,
  mockHistory,
  serializedFilterQuery,
  testCases,
} from './test_dependencies';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import { createStore, State } from '../../store';

let mockProps: UrlStateContainerPropTypes;

const indexPattern: StaticIndexPattern = {
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
  ],
};
describe('UrlStateContainer', () => {
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('mounts and renders', () => {
    const wrapper = mount(
      <MockedProvider>
        <TestProviders store={store}>
          <Router history={mockHistory}>
            <UrlStateContainer indexPattern={indexPattern} />
          </Router>
        </TestProviders>
      </MockedProvider>
    );
    const urlStateComponents = wrapper.find('[data-test-subj="urlStateComponents"]');
    urlStateComponents.exists();
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('handleInitialize', () => {
    describe('URL state updates redux', () => {
      describe('relative timerange actions are called with correct data on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
            .relativeTimeSearch.undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);
          // @ts-ignore property mock does not exists
          expect(defaultProps.setRelativeTimerange.mock.calls[0][0]).toEqual({
            from: 1558591200000,
            fromStr: 'now-1d/d',
            kind: 'relative',
            to: 1558677599999,
            toStr: 'now-1d/d',
            id: 'global',
          });
          // @ts-ignore property mock does not exists
          expect(defaultProps.setRelativeTimerange.mock.calls[1][0]).toEqual({
            from: 1558732849370,
            fromStr: 'now-15m',
            kind: 'relative',
            to: 1558733749370,
            toStr: 'now',
            id: 'timeline',
          });
        });
      });
      describe('absolute timerange actions are called with correct data on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
            .absoluteTimeSearch.undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);
          // @ts-ignore property mock does not exists
          expect(defaultProps.setAbsoluteTimerange.mock.calls[0][0]).toEqual({
            from: 1556736012685,
            kind: 'absolute',
            to: 1556822416082,
            id: 'global',
          });
          // @ts-ignore property mock does not exists
          expect(defaultProps.setAbsoluteTimerange.mock.calls[1][0]).toEqual({
            from: 1556736012685,
            kind: 'absolute',
            to: 1556822416082,
            id: 'timeline',
          });
        });
      });
      describe('kqlQuery action is called with correct data on component mount', () => {
        test.each(testCases)(' %o', (page, namespaceLower, namespaceUpper, examplePath, type) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
            .relativeTimeSearch.undefinedQuery;
          shallow(<UrlStateContainerLifecycle {...mockProps} />);
          const functionName =
            namespaceUpper === 'Network' ? defaultProps.setNetworkKql : defaultProps.setHostsKql;
          // @ts-ignore property mock does not exists
          expect(functionName.mock.calls[0][0]).toEqual({
            filterQuery: serializedFilterQuery,
            [`${namespaceLower}Type`]: type,
          });
        });
      });
      describe('kqlQuery action is not called called when the queryLocation does not match the router location', () => {
        test.each(testCases)(
          '%o',
          async (page, namespaceLower, namespaceUpper, examplePath, type) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type })
              .oppositeQueryLocationSearch.undefinedQuery;
            shallow(<UrlStateContainerLifecycle {...mockProps} />);
            const functionName =
              namespaceUpper === 'Network' ? defaultProps.setNetworkKql : defaultProps.setHostsKql;
            // @ts-ignore property mock does not exists
            expect(functionName.mock.calls.length).toEqual(0);
          }
        );
      });
    });

    describe('Redux updates URL state', () => {
      describe('kqlQuery url state is set from redux data on component mount', () => {
        test.each(testCases)(
          '%o',
          async (page, namespaceLower, namespaceUpper, examplePath, type) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, type }).noSearch
              .definedQuery;
            shallow(<UrlStateContainerLifecycle {...mockProps} />);

            // @ts-ignore property mock does not exists
            expect(mockHistory.replace.mock.calls[0][0]).toEqual({
              hash: '',
              pathname: examplePath,
              search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page},type:${type})`,
              state: '',
            });
          }
        );
      });
    });
  });
});
