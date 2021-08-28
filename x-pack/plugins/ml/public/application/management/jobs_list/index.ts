/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import type { CoreSetup, CoreStart } from '../../../../../../../src/core/public/types';
import type { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public/types';
import type { ManagementAppMountParams } from '../../../../../../../src/plugins/management/public/types';
import type { SharePluginStart } from '../../../../../../../src/plugins/share/public/plugin';
import type { UsageCollectionSetup } from '../../../../../../../src/plugins/usage_collection/public/plugin';
import type { SpacesPluginStart } from '../../../../../spaces/public/plugin';
import type { MlStartDependencies } from '../../../plugin';
import { clearCache, setDependencyCache } from '../../util/dependency_cache';
import { getJobsListBreadcrumbs } from '../breadcrumbs';
import { JobsListPage } from './components/jobs_list_page/jobs_list_page';
import './_index.scss';

const renderApp = (
  element: HTMLElement,
  history: ManagementAppMountParams['history'],
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  spacesApi?: SpacesPluginStart,
  usageCollection?: UsageCollectionSetup
) => {
  ReactDOM.render(
    React.createElement(JobsListPage, {
      coreStart,
      history,
      share,
      data,
      spacesApi,
      usageCollection,
    }),
    element
  );
  return () => {
    unmountComponentAtNode(element);
    clearCache();
  };
};

export async function mountApp(
  core: CoreSetup<MlStartDependencies>,
  params: ManagementAppMountParams,
  deps: { usageCollection?: UsageCollectionSetup }
) {
  const [coreStart, pluginsStart] = await core.getStartServices();

  setDependencyCache({
    docLinks: coreStart.docLinks!,
    basePath: coreStart.http.basePath,
    http: coreStart.http,
    i18n: coreStart.i18n,
  });

  params.setBreadcrumbs(getJobsListBreadcrumbs());
  return renderApp(
    params.element,
    params.history,
    coreStart,
    pluginsStart.share,
    pluginsStart.data,
    pluginsStart.spaces,
    deps.usageCollection
  );
}
