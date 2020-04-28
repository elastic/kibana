/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import React from 'react';
import { Route } from 'react-router-dom';
import { mountWithRouter } from '../../lib';
import { OVERVIEW_ROUTE } from '../../../common/constants';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { UptimeUrlParams, getSupportedUrlParams } from '../../lib/helper';
import { makeBaseBreadcrumb, useBreadcrumbs } from '../use_breadcrumbs';

describe('useBreadcrumbs', () => {
  it('sets the given breadcrumbs', () => {
    const [getBreadcrumbs, core] = mockCore();

    const expectedCrumbs: ChromeBreadcrumb[] = [
      {
        text: 'Crumb: ',
        href: 'http://href.example.net',
      },
      {
        text: 'Crumb II: Son of Crumb',
        href: 'http://href2.example.net',
      },
    ];

    const Component = () => {
      useBreadcrumbs(expectedCrumbs);
      return <>Hello</>;
    };

    mountWithRouter(
      <KibanaContextProvider services={{ ...core }}>
        <Route path={OVERVIEW_ROUTE}>
          <Component />
        </Route>
      </KibanaContextProvider>
    );

    const urlParams: UptimeUrlParams = getSupportedUrlParams({});
    expect(getBreadcrumbs()).toStrictEqual([makeBaseBreadcrumb(urlParams)].concat(expectedCrumbs));
  });
});

const mockCore: () => [() => ChromeBreadcrumb[], any] = () => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const get = () => {
    return breadcrumbObj;
  };
  const core = {
    chrome: {
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbObj = newBreadcrumbs;
      },
    },
  };

  return [get, core];
};
