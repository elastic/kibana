/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { encode } from 'rison-node';
import { coreMock } from 'src/core/public/mocks';
import { ScopedHistory } from '../../../../../src/core/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { LinkDescriptor, useLinkProps } from './use_link_props';

const PREFIX = '/test-basepath/s/test-space/app/';

const coreStartMock = coreMock.createStart();

coreStartMock.application.getUrlForApp.mockImplementation((app, options) => {
  return `${PREFIX}${app}${options?.path}`;
});

const INTERNAL_APP = 'metrics';

const history = createMemoryHistory();
history.push(`${PREFIX}${INTERNAL_APP}`);
const scopedHistory = new ScopedHistory(history, `${PREFIX}${INTERNAL_APP}`);

const ProviderWrapper: React.FC = ({ children }) => {
  return (
    <Router history={scopedHistory}>
      <KibanaContextProvider services={{ ...coreStartMock }}>{children}</KibanaContextProvider>;
    </Router>
  );
};

const renderUseLinkPropsHook = (props?: Partial<LinkDescriptor>) => {
  return renderHook(() => useLinkProps({ app: INTERNAL_APP, ...props }), {
    wrapper: ProviderWrapper,
  });
};
describe('useLinkProps hook', () => {
  describe('Handles internal linking', () => {
    it('Provides the correct baseline props', () => {
      const { result } = renderUseLinkPropsHook({ pathname: '/' });
      expect(result.current.href).toBe('/test-basepath/s/test-space/app/metrics/');
      expect(result.current.onClick).toBeDefined();
    });

    it('Provides the correct props with options', () => {
      const { result } = renderUseLinkPropsHook({
        pathname: '/inventory',
        search: {
          type: 'host',
          id: 'some-id',
          count: '12345',
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/metrics/inventory?type=host&id=some-id&count=12345'
      );
      expect(result.current.onClick).toBeDefined();
    });

    it('Provides the correct props with more complex encoding', () => {
      const { result } = renderUseLinkPropsHook({
        pathname: '/inventory',
        search: {
          type: 'host + host',
          name: 'this name has spaces and ** and %',
          id: 'some-id',
          count: '12345',
          animals: ['dog', 'cat', 'bear'],
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/metrics/inventory?type=host%20%2B%20host&name=this%20name%20has%20spaces%20and%20**%20and%20%25&id=some-id&count=12345&animals=dog,cat,bear'
      );
      expect(result.current.onClick).toBeDefined();
    });

    it('Provides the correct props with a consumer using Rison encoding for search', () => {
      const state = {
        refreshInterval: { pause: true, value: 0 },
        time: { from: 12345, to: 54321 },
      };
      const { result } = renderUseLinkPropsHook({
        pathname: '/inventory',
        search: {
          type: 'host + host',
          state: encode(state),
        },
      });
      expect(result.current.href).toBe(
        '/test-basepath/s/test-space/app/metrics/inventory?type=host%20%2B%20host&state=(refreshInterval:(pause:!t,value:0),time:(from:12345,to:54321))'
      );
      expect(result.current.onClick).toBeDefined();
    });
  });

  describe('Handles external linking', () => {
    it('Provides the correct baseline props', () => {
      const { result } = renderUseLinkPropsHook({
        app: 'ml',
        pathname: '/',
      });
      expect(result.current.href).toBe('/test-basepath/s/test-space/app/ml/');
      expect(result.current.onClick).toBeDefined();
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
      expect(result.current.onClick).toBeDefined();
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
      expect(result.current.onClick).toBeDefined();
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
      expect(result.current.onClick).toBeDefined();
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
      expect(result.current.onClick).toBeDefined();
    });
  });
});
