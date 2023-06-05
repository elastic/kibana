/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import { coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

export const createMlStartDepsMock = () => ({
  data: dataPluginMock.createStartContract(),
  share: sharePluginMock.createStartContract(),
  uiActions: uiActionsPluginMock.createStartContract(),
  spaces: jest.fn(),
  embeddable: embeddablePluginMock.createStartContract(),
  maps: jest.fn(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
  dataVisualizer: jest.fn(),
});

const appMountParametersMock = coreMock.createAppMountParameters();
export const createMlPageDepsMock = () => ({
  savedSearchService: savedSearchPluginMock.createStartContract(),
  history: appMountParametersMock.history,
  setHeaderActionMenu: appMountParametersMock.setHeaderActionMenu,
  dataViewsContract: dataViewPluginMocks.createStartContract(),
  config: uiSettingsServiceMock.createStartContract(),
  setBreadcrumbs: jest.fn(),
  redirectToMlAccessDeniedPage: jest.fn(),
});

// const pageDeps = {
//   savedSearchService: deps.savedSearch,
//   history: appMountParams.history,
//   setHeaderActionMenu: appMountParams.setHeaderActionMenu,
//   dataViewsContract: deps.data.dataViews,
//   config: coreStart.uiSettings!,
//   setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
//   redirectToMlAccessDeniedPage,
// };

// const deps: PageDependencies =  {
//   savedSearchService: SavedSearchPublicPluginStart;
//   config: IUiSettingsClient;
//   history: AppMountParameters['history'];
//   setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
//   dataViewsContract: DataViewsContract;
//   setBreadcrumbs: ChromeStart['setBreadcrumbs'];
//   redirectToMlAccessDeniedPage: jest.fn();
// }
