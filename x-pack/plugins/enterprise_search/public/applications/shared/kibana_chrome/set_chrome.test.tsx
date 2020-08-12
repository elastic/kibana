/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import '../../__mocks__/react_router_history.mock';
import { mockKibanaContext, mountWithKibanaContext } from '../../__mocks__';

jest.mock('./generate_breadcrumbs', () => ({
  appSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
  workplaceSearchBreadcrumbs: jest.fn(() => (crumbs: any) => crumbs),
}));
import { appSearchBreadcrumbs, workplaceSearchBreadcrumbs } from './generate_breadcrumbs';

jest.mock('./generate_title', () => ({
  appSearchTitle: jest.fn((title: any) => title),
  workplaceSearchTitle: jest.fn((title: any) => title),
}));
import { appSearchTitle, workplaceSearchTitle } from './generate_title';

import { SetAppSearchChrome, SetWorkplaceSearchChrome } from './';

describe('SetAppSearchChrome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    expect(appSearchBreadcrumbs).toHaveBeenCalled();
    expect(appSearchTitle).toHaveBeenCalled();
  });

  it('sets breadcrumbs and document title', () => {
    mountWithKibanaContext(<SetAppSearchChrome text="Engines" />);

    expect(mockKibanaContext.setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'Engines',
        path: '/current-path',
      },
    ]);
    expect(mockKibanaContext.setDocTitle).toHaveBeenCalledWith(['Engines']);
  });

  it('sets empty breadcrumbs and document title when isRoot is true', () => {
    mountWithKibanaContext(<SetAppSearchChrome isRoot />);

    expect(mockKibanaContext.setBreadcrumbs).toHaveBeenCalledWith([]);
    expect(mockKibanaContext.setDocTitle).toHaveBeenCalledWith([]);
  });
});

describe('SetWorkplaceSearchChrome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    expect(workplaceSearchBreadcrumbs).toHaveBeenCalled();
    expect(workplaceSearchTitle).toHaveBeenCalled();
  });

  it('sets breadcrumbs and document title', () => {
    mountWithKibanaContext(<SetWorkplaceSearchChrome text="Sources" />);

    expect(mockKibanaContext.setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'Sources',
        path: '/current-path',
      },
    ]);
    expect(mockKibanaContext.setDocTitle).toHaveBeenCalledWith(['Sources']);
  });

  it('sets empty breadcrumbs and document title when isRoot is true', () => {
    mountWithKibanaContext(<SetWorkplaceSearchChrome isRoot />);

    expect(mockKibanaContext.setBreadcrumbs).toHaveBeenCalledWith([]);
    expect(mockKibanaContext.setDocTitle).toHaveBeenCalledWith([]);
  });
});
