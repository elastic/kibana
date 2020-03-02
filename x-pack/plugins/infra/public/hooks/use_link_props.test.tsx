/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encode } from 'rison-node';
import { createMemoryHistory } from 'history';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { HistoryContext } from '../utils/history_context';
import { coreMock } from 'src/core/public/mocks';
import { useLinkProps } from './use_link_props';

const coreStartMock = coreMock.createStart();

coreStartMock.application.getUrlForApp.mockImplementation((app, options) => {
  return `/test-basepath/s/test-space/app/${app}${options?.path}`;
});

// Note: Memory history doesn't support baseName
const history = createMemoryHistory();

const ProviderWrapper: React.FC = ({ children }) => {
  return (
    <HistoryContext.Provider value={history}>
      <KibanaContextProvider services={{ ...coreStartMock }}>{children}</KibanaContextProvider>;
    </HistoryContext.Provider>
  );
};

const renderUseLinkPropsHook = (props?: any) => {
  return renderHook(() => useLinkProps(props), { wrapper: ProviderWrapper });
};
describe('useLinkProps hook', () => {
  describe('Handles internal linking', () => {
    it('Provides the correct baseline props', () => {
      const { result } = renderUseLinkPropsHook({});
      expect(result.current.href).toBe('/');
      expect(result.current.onClick).toBeDefined();
    });

    it('Provides the correct props with options', () => {
      const { result } = renderUseLinkPropsHook({
        pathname: 'inventory',
        search: {
          type: 'host',
          id: 'some-id',
          count: '12345',
        },
      });
      expect(result.current.href).toBe('/inventory?type=host&id=some-id&count=12345');
      expect(result.current.onClick).toBeDefined();
    });

    it('Provides the correct props with more complex encoding', () => {
      const { result } = renderUseLinkPropsHook({
        pathname: 'inventory',
        search: {
          type: 'host + host',
          name: 'this name has spaces and ** and %',
          id: 'some-id',
          count: '12345',
          animals: ['dog', 'cat', 'bear'],
        },
      });
      expect(result.current.href).toBe(
        '/inventory?type=host%20%2B%20host&name=this%20name%20has%20spaces%20and%20**%20and%20%25&id=some-id&count=12345&animals=dog,cat,bear'
      );
      expect(result.current.onClick).toBeDefined();
    });

    it('Provides the correct props with a consumer using Rison encoding for search', () => {
      const state = {
        refreshInterval: { pause: true, value: 0 },
        time: { from: 12345, to: 54321 },
      };
      const { result } = renderUseLinkPropsHook({
        pathname: 'inventory',
        search: {
          type: 'host + host',
          state: encode(state),
        },
      });
      expect(result.current.href).toBe(
        '/inventory?type=host%20%2B%20host&state=(refreshInterval:(pause:!t,value:0),time:(from:12345,to:54321))'
      );
      expect(result.current.onClick).toBeDefined();
    });
  });

  describe('Handles external linking', () => {
    it('Provides the correct baseline props', () => {
      const { result } = renderUseLinkPropsHook({
        app: 'ml',
      });
      expect(result.current.href).toBe('/test-basepath/s/test-space/app/ml');
      expect(result.current.onClick).not.toBeDefined();
    });

    it('Provides the correct props with pathname options', () => {
      const { result } = renderUseLinkPropsHook({
        app: 'ml',
        pathname: '/explorer',
        search: {
          type: 'host',
          id: 'some-id',
          count: '12345',
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/ml/explorer?type=host&id=some-id&count=12345'
      );
      expect(result.current.onClick).not.toBeDefined();
    });

    it('Provides the correct props with hash options', () => {
      const { result } = renderUseLinkPropsHook({
        app: 'ml',
        hash: '/explorer',
        search: {
          type: 'host',
          id: 'some-id',
          count: '12345',
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/ml#/explorer?type=host&id=some-id&count=12345'
      );
      expect(result.current.onClick).not.toBeDefined();
    });

    it('Provides the correct props with more complex encoding', () => {
      const { result } = renderUseLinkPropsHook({
        app: 'ml',
        hash: '/explorer',
        search: {
          type: 'host + host',
          name: 'this name has spaces and ** and %',
          id: 'some-id',
          count: '12345',
          animals: ['dog', 'cat', 'bear'],
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/ml#/explorer?type=host%20%2B%20host&name=this%20name%20has%20spaces%20and%20**%20and%20%25&id=some-id&count=12345&animals=dog,cat,bear'
      );
      expect(result.current.onClick).not.toBeDefined();
    });

    it('Provides the correct props with a consumer using Rison encoding for search', () => {
      const state = {
        refreshInterval: { pause: true, value: 0 },
        time: { from: 12345, to: 54321 },
      };
      const { result } = renderUseLinkPropsHook({
        app: 'rison-app',
        hash: 'rison-route',
        search: {
          type: 'host + host',
          state: encode(state),
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/rison-app#rison-route?type=host%20%2B%20host&state=(refreshInterval:(pause:!t,value:0),time:(from:12345,to:54321))'
      );
      expect(result.current.onClick).not.toBeDefined();
    });
  });
});
