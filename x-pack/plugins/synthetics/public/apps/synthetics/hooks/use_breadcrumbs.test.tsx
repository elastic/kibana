/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { render } from '../utils/testing';
import React from 'react';
import { Route } from 'react-router-dom';
import { OVERVIEW_ROUTE } from '../../../../common/constants';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  SyntheticsUrlParams,
  getSupportedUrlParams,
} from '../utils/url_params/get_supported_url_params';
import { makeBaseBreadcrumb, useBreadcrumbs } from './use_breadcrumbs';

describe('useBreadcrumbs', () => {
  it('sets the given breadcrumbs', () => {
    const [getBreadcrumbs, core] = mockCore();

    const expectedCrumbs: ChromeBreadcrumb[] = [
      { text: 'Crumb: ', href: 'http://href.example.net' },
      { text: 'Crumb II: Son of Crumb', href: 'http://href2.example.net' },
    ];

    const Component = () => {
      useBreadcrumbs(expectedCrumbs);
      return <>Hello</>;
    };

    render(
      <KibanaContextProvider services={{ ...core }}>
        <Route path={OVERVIEW_ROUTE}>
          <Component />
        </Route>
      </KibanaContextProvider>
    );

    const urlParams: SyntheticsUrlParams = getSupportedUrlParams({});
    expect(JSON.stringify(getBreadcrumbs())).toEqual(
      JSON.stringify(
        makeBaseBreadcrumb('/app/synthetics', '/app/observability', urlParams).concat(
          expectedCrumbs
        )
      )
    );
  });
});

const mockCore: () => [() => ChromeBreadcrumb[], any] = () => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const get = () => {
    return breadcrumbObj;
  };
  const core = {
    application: {
      getUrlForApp: (app: string) =>
        app === 'synthetics' ? '/app/synthetics' : '/app/observability',
      navigateToUrl: jest.fn(),
    },
    chrome: {
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbObj = newBreadcrumbs;
      },
    },
  };

  return [get, core];
};
