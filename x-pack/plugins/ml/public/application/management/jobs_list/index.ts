/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
import { CoreSetup, CoreStart } from 'kibana/public';
import { ManagementAppMountParams } from '../../../../../../../src/plugins/management/public/';
import { MlStartDependencies } from '../../../plugin';
import { JobsListPage } from './components';
import { getJobsListBreadcrumbs } from '../breadcrumbs';
import { setDependencyCache, clearCache } from '../../util/dependency_cache';

const renderApp = (element: HTMLElement, coreStart: CoreStart) => {
  ReactDOM.render(React.createElement(JobsListPage, { coreStart }), element);
  return () => {
    unmountComponentAtNode(element);
    clearCache();
  };
};

export async function mountApp(
  core: CoreSetup<MlStartDependencies>,
  params: ManagementAppMountParams
) {
  const [coreStart] = await core.getStartServices();

  setDependencyCache({
    docLinks: coreStart.docLinks!,
    basePath: coreStart.http.basePath,
    http: coreStart.http,
    i18n: coreStart.i18n,
  });

  params.setBreadcrumbs(getJobsListBreadcrumbs());

  return renderApp(params.element, coreStart);
}
