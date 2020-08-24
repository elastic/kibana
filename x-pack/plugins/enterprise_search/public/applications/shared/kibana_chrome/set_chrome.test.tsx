/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/shallow_usecontext.mock';
import '../../__mocks__/react_router_history.mock';

import React from 'react';

import { mockKibanaContext, mountWithKibanaContext } from '../../__mocks__';

jest.mock('./generate_breadcrumbs', () => ({
  useAppSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
  useWorkplaceSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
}));
import { useAppSearchBreadcrumbs, useWorkplaceSearchBreadcrumbs } from './generate_breadcrumbs';

jest.mock('./generate_title', () => ({
  appSearchTitle: jest.fn((title: any) => title),
  workplaceSearchTitle: jest.fn((title: any) => title),
}));
import { appSearchTitle, workplaceSearchTitle } from './generate_title';

import { SetAppSearchChrome, SetWorkplaceSearchChrome } from './';

describe('Set Kibana Chrome helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    expect(mockKibanaContext.setBreadcrumbs).toHaveBeenCalled();
    expect(mockKibanaContext.setDocTitle).toHaveBeenCalled();
  });

  describe('SetAppSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      mountWithKibanaContext(<SetAppSearchChrome text="Engines" />);

      expect(appSearchTitle).toHaveBeenCalledWith(['Engines']);
      expect(useAppSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Engines',
          path: '/current-path',
        },
      ]);
    });

    it('sets empty breadcrumbs and document title when isRoot is true', () => {
      mountWithKibanaContext(<SetAppSearchChrome isRoot />);

      expect(appSearchTitle).toHaveBeenCalledWith([]);
      expect(useAppSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('SetWorkplaceSearchChrome', () => {
    it('sets breadcrumbs and document title', () => {
      mountWithKibanaContext(<SetWorkplaceSearchChrome text="Sources" />);

      expect(workplaceSearchTitle).toHaveBeenCalledWith(['Sources']);
      expect(useWorkplaceSearchBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Sources',
          path: '/current-path',
        },
      ]);
    });

    it('sets empty breadcrumbs and document title when isRoot is true', () => {
      mountWithKibanaContext(<SetWorkplaceSearchChrome isRoot />);

      expect(workplaceSearchTitle).toHaveBeenCalledWith([]);
      expect(useWorkplaceSearchBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });
});
