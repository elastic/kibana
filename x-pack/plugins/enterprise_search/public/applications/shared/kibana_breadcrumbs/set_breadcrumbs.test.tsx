/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import '../../test_utils/mock_rr_usehistory';
import { mountWithKibanaContext } from '../../test_utils';

jest.mock('./generate_breadcrumbs', () => ({ appSearchBreadcrumbs: jest.fn() }));
import { appSearchBreadcrumbs, SetAppSearchBreadcrumbs } from './';

describe('SetAppSearchBreadcrumbs', () => {
  const setBreadcrumbs = jest.fn();
  const builtBreadcrumbs = [];
  const appSearchBreadCrumbsInnerCall = jest.fn().mockReturnValue(builtBreadcrumbs);
  const appSearchBreadCrumbsOuterCall = jest.fn().mockReturnValue(appSearchBreadCrumbsInnerCall);
  appSearchBreadcrumbs.mockImplementation(appSearchBreadCrumbsOuterCall);

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mountSetAppSearchBreadcrumbs = props => {
    return mountWithKibanaContext(<SetAppSearchBreadcrumbs {...props} />, {
      http: {},
      enterpriseSearchUrl: 'http://localhost:3002',
      setBreadcrumbs,
    });
  };

  describe('when isRoot is false', () => {
    const subject = () => mountSetAppSearchBreadcrumbs({ text: 'Page 1', isRoot: false });

    it('calls appSearchBreadcrumbs to build breadcrumbs, then registers them with Kibana', () => {
      subject();

      // calls appSearchBreadcrumbs to build breadcrumbs with the target page and current location
      expect(appSearchBreadCrumbsInnerCall).toHaveBeenCalledWith([
        { text: 'Page 1', path: '/current-path' },
      ]);

      // then registers them with Kibana
      expect(setBreadcrumbs).toHaveBeenCalledWith(builtBreadcrumbs);
    });
  });

  describe('when isRoot is true', () => {
    const subject = () => mountSetAppSearchBreadcrumbs({ text: 'Page 1', isRoot: true });

    it('calls appSearchBreadcrumbs to build breadcrumbs with an empty breadcrumb, then registers them with Kibana', () => {
      subject();

      // uses an empty bredcrumb
      expect(appSearchBreadCrumbsInnerCall).toHaveBeenCalledWith([]);

      // then registers them with Kibana
      expect(setBreadcrumbs).toHaveBeenCalledWith(builtBreadcrumbs);
    });
  });
});
