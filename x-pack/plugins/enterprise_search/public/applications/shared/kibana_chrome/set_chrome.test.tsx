/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kea.mock';
import '../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/react_router_history.mock';
import { mockKibanaValues } from '../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

jest.mock('./generate_breadcrumbs', () => ({
  useEnterpriseSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
  useAppSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
  useWorkplaceSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
}));
import {
  useEnterpriseSearchBreadcrumbs,
  useAppSearchBreadcrumbs,
  useWorkplaceSearchBreadcrumbs,
} from './generate_breadcrumbs';

jest.mock('./generate_title', () => ({
  enterpriseSearchTitle: jest.fn((title: any) => title),
  appSearchTitle: jest.fn((title: any) => title),
  workplaceSearchTitle: jest.fn((title: any) => title),
}));
import { enterpriseSearchTitle, appSearchTitle, workplaceSearchTitle } from './generate_title';

import { SetEnterpriseSearchChrome, SetAppSearchChrome, SetWorkplaceSearchChrome } from './';

describe('Set Kibana Chrome helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    expect(mockKibanaValues.setBreadcrumbs).toHaveBeenCalled();
    expect(mockKibanaValues.setDocTitle).toHaveBeenCalled();
  });

  describe('SetEnterpriseSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      shallow(<SetEnterpriseSearchChrome text="Hello World" />);

      expect(enterpriseSearchTitle).toHaveBeenCalledWith(['Hello World']);
      expect(useEnterpriseSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Hello World',
          path: '/current-path',
        },
      ]);
    });

    it('sets empty breadcrumbs and document title when isRoot is true', () => {
      shallow(<SetEnterpriseSearchChrome isRoot />);

      expect(enterpriseSearchTitle).toHaveBeenCalledWith([]);
      expect(useEnterpriseSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('SetAppSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      shallow(<SetAppSearchChrome text="Engines" />);

      expect(appSearchTitle).toHaveBeenCalledWith(['Engines']);
      expect(useAppSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Engines',
          path: '/current-path',
        },
      ]);
    });

    it('sets empty breadcrumbs and document title when isRoot is true', () => {
      shallow(<SetAppSearchChrome isRoot />);

      expect(appSearchTitle).toHaveBeenCalledWith([]);
      expect(useAppSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('SetWorkplaceSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      shallow(<SetWorkplaceSearchChrome text="Sources" />);

      expect(workplaceSearchTitle).toHaveBeenCalledWith(['Sources']);
      expect(useWorkplaceSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Sources',
          path: '/current-path',
        },
      ]);
    });

    it('sets empty breadcrumbs and document title when isRoot is true', () => {
      shallow(<SetWorkplaceSearchChrome isRoot />);

      expect(workplaceSearchTitle).toHaveBeenCalledWith([]);
      expect(useWorkplaceSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });
});
