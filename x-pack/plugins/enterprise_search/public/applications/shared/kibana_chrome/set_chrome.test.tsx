/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/shallow_useeffect.mock';
import { setMockValues, mockKibanaValues } from '../../__mocks__/kea_logic';
import { mockHistory } from '../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

jest.mock('./generate_breadcrumbs', () => ({
  useGenerateBreadcrumbs: jest.requireActual('./generate_breadcrumbs').useGenerateBreadcrumbs,
  useSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
  useAppSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
  useWorkplaceSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
}));
import {
  useSearchBreadcrumbs,
  useAppSearchBreadcrumbs,
  useWorkplaceSearchBreadcrumbs,
} from './generate_breadcrumbs';

jest.mock('./generate_title', () => ({
  searchTitle: jest.fn((title: any) => title),
  appSearchTitle: jest.fn((title: any) => title),
  workplaceSearchTitle: jest.fn((title: any) => title),
}));
import { searchTitle, appSearchTitle, workplaceSearchTitle } from './generate_title';

import { SetSearchChrome, SetAppSearchChrome, SetWorkplaceSearchChrome } from '.';

describe('Set Kibana Chrome helpers', () => {
  const mockCurrentPath = (pathname: string) =>
    setMockValues({ history: { location: { pathname } } });

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ history: mockHistory });
  });

  afterEach(() => {
    expect(mockKibanaValues.setBreadcrumbs).toHaveBeenCalled();
    expect(mockKibanaValues.setDocTitle).toHaveBeenCalled();
  });

  describe('SetSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      shallow(<SetSearchChrome trail={['Hello World']} />);

      expect(searchTitle).toHaveBeenCalledWith(['Hello World']);
      expect(useSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Hello World',
          path: '/current-path',
        },
      ]);
    });

    it('handles empty trails as a root-level page', () => {
      shallow(<SetSearchChrome />);

      expect(searchTitle).toHaveBeenCalledWith([]);
      expect(useSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('SetAppSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      mockCurrentPath('/engines/{name}/curations');
      shallow(<SetAppSearchChrome trail={['Engines', 'Some Engine', 'Curations']} />);

      expect(appSearchTitle).toHaveBeenCalledWith(['Curations', 'Some Engine', 'Engines']);
      expect(useAppSearchBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Engines', path: '/engines' },
        { text: 'Some Engine', path: '/engines/{name}' },
        { text: 'Curations', path: '/engines/{name}/curations' },
      ]);
    });

    it('handles empty trails as a root-level page', () => {
      shallow(<SetAppSearchChrome />);

      expect(appSearchTitle).toHaveBeenCalledWith([]);
      expect(useAppSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('SetWorkplaceSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      mockCurrentPath('/groups/{id}/source_prioritization');
      shallow(
        <SetWorkplaceSearchChrome trail={['Groups', 'Some Group', 'Source Prioritization']} />
      );

      expect(workplaceSearchTitle).toHaveBeenCalledWith([
        'Source Prioritization',
        'Some Group',
        'Groups',
      ]);
      expect(useWorkplaceSearchBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Groups', path: '/groups' },
        { text: 'Some Group', path: '/groups/{id}' },
        { text: 'Source Prioritization', path: '/groups/{id}/source_prioritization' },
      ]);
    });

    it('handles empty trails as a root-level page', () => {
      shallow(<SetWorkplaceSearchChrome />);

      expect(workplaceSearchTitle).toHaveBeenCalledWith([]);
      expect(useWorkplaceSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });
});
