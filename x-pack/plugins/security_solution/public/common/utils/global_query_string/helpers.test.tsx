/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  isDetectionsPages,
  getQueryStringFromLocation,
  getParamFromQueryString,
  getObjectFromQueryString,
  useGetInitialUrlParamValue,
  encodeQueryString,
  useReplaceUrlParams,
  createHistoryEntry,
} from './helpers';
import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import React from 'react';

const flyoutString =
  "(left:(id:document-details-left,params:(id:'04cf6ea970ab702721f17755b718c1296b5f8b5fcf7b74b053eab9bc885ceb9c',indexName:.internal.alerts-security.alerts-default-000001,scopeId:alerts-page)),right:(id:document-details-right,params:(id:'04cf6ea970ab702721f17755b718c1296b5f8b5fcf7b74b053eab9bc885ceb9c',indexName:.internal.alerts-security.alerts-default-000001,scopeId:alerts-page)))";
const testString = `sourcerer=(default:(id:security-solution-default,selectedPatterns:!(.alerts-security.alerts-default)))&timerange=(global:(linkTo:!(),timerange:(from:%272024-05-14T23:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272024-05-15T22:59:59.999Z%27,toStr:now%2Fd)),timeline:(linkTo:!(),timerange:(from:%272024-05-14T09:32:36.347Z%27,kind:absolute,to:%272024-05-15T09:32:36.347Z%27)))&timeline=(activeTab:query,graphEventId:%27%27,isOpen:!f)&pageFilters=!((exclude:!f,existsSelected:!f,fieldName:kibana.alert.workflow_status,hideActionBar:!t,selectedOptions:!(open),title:Status),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.severity,hideActionBar:!t,selectedOptions:!(),title:Severity),(exclude:!f,existsSelected:!f,fieldName:user.name,hideActionBar:!f,selectedOptions:!(),title:User),(exclude:!f,existsSelected:!f,fieldName:host.name,hideActionBar:!f,selectedOptions:!(),title:Host))&flyout=${flyoutString}&timelineFlyout=()`;

const flyoutObject = {
  left: {
    id: 'document-details-left',
    params: {
      id: '04cf6ea970ab702721f17755b718c1296b5f8b5fcf7b74b053eab9bc885ceb9c',
      indexName: '.internal.alerts-security.alerts-default-000001',
      scopeId: 'alerts-page',
    },
  },
  right: {
    id: 'document-details-right',
    params: {
      id: '04cf6ea970ab702721f17755b718c1296b5f8b5fcf7b74b053eab9bc885ceb9c',
      indexName: '.internal.alerts-security.alerts-default-000001',
      scopeId: 'alerts-page',
    },
  },
};

describe('helpers', () => {
  describe('isDetectionsPages', () => {
    it('returns true for detections pages', () => {
      expect(isDetectionsPages('alerts')).toBe(true);
      expect(isDetectionsPages('rules')).toBe(true);
      expect(isDetectionsPages('rules-add')).toBe(true);
      expect(isDetectionsPages('rules-create')).toBe(true);
      expect(isDetectionsPages('exceptions')).toBe(true);
    });

    it('returns false for non-detections pages', () => {
      expect(isDetectionsPages('otherPage')).toBe(false);
    });
  });

  describe('getQueryStringFromLocation', () => {
    it('returns the query string without the leading "?"', () => {
      expect(getQueryStringFromLocation('?param=value')).toBe('param=value');
    });
  });

  describe('getParamFromQueryString', () => {
    it('returns the value of the specified query parameter', () => {
      expect(getParamFromQueryString(testString, 'flyout')).toBe(flyoutString);
    });

    it('returns undefined if the query parameter is not found', () => {
      expect(getParamFromQueryString(testString, 'param')).toBeUndefined();
    });

    it('returns the first value if the query parameter is an array', () => {
      const queryString = 'param1=value1&param1=value2';
      expect(getParamFromQueryString(queryString, 'param1')).toBe('value1');
    });
  });

  describe('getObjectFromQueryString', () => {
    it('returns the decoded value of the specified query parameter', () => {
      expect(getObjectFromQueryString('flyout', testString)).toEqual(flyoutObject);
    });

    it('returns null if the query parameter is not found', () => {
      expect(getObjectFromQueryString('param', testString)).toBeNull();
    });
  });

  describe('useGetInitialUrlParamValue', () => {
    it('returns a function that gets the initial URL parameter value', () => {
      window.history.pushState({}, '', `?${testString}`);
      const { result } = renderHook(() => useGetInitialUrlParamValue('flyout'));
      expect(result.current()).toEqual(flyoutObject);
    });
  });

  describe('encodeQueryString', () => {
    it('returns an encoded query string from the given parameters', () => {
      const params = { param1: 'value1', param2: 'value2' };
      expect(encodeQueryString(params)).toBe('param1=value1&param2=value2');
    });
  });

  describe('useReplaceUrlParams', () => {
    it('replaces URL parameters correctly', () => {
      const history = createMemoryHistory();
      const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <Router history={history}>{children}</Router>
      );
      const { result } = renderHook(() => useReplaceUrlParams(), { wrapper: Wrapper });

      window.history.pushState({}, '', '?param1=value1');
      result.current({ param1: 'value2' });
      expect(history.location.search).toBe('?param1=value2');
    });
  });

  describe('createHistoryEntry', () => {
    it('creates a new history entry', () => {
      const initialHistoryLength = window.history.length;
      createHistoryEntry();
      expect(window.history.length).toBe(initialHistoryLength + 1);
    });
  });
});
