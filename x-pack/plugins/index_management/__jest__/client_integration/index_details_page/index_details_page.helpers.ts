/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AsyncTestBedConfig,
  reactRouterMock,
  registerTestBed,
  TestBed,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { act } from 'react-dom/test-utils';
import {
  IndexDetailsPage,
  IndexDetailsSection,
} from '../../../public/application/sections/home/index_list/details_page';
import { WithAppDependencies } from '../helpers';

let routerMock: typeof reactRouterMock;
const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/indices/test_index`],
    componentRoutePath: `/indices/:indexName/:indexDetailsSection?`,
    onRouter: (router) => {
      routerMock = router;
    },
  },
  doMountAsync: true,
};

export interface IndexDetailsPageTestBed extends TestBed {
  routerMock: typeof reactRouterMock;
  actions: {
    getHeader: () => string;
    clickIndexDetailsTab: (tab: IndexDetailsSection) => Promise<void>;
    getActiveTabContent: () => string;
    clickBackToIndicesButton: () => Promise<void>;
    discoverLinkExists: () => boolean;
    indexStatsContentExists: () => boolean;
    indexDetailsContentExists: () => boolean;
    addDocCodeBlockExists: () => boolean;
    contextMenu: {
      clickManageIndexButton: () => Promise<void>;
      isOpened: () => boolean;
    };
    errorSection: {
      isDisplayed: () => boolean;
      clickReloadButton: () => Promise<void>;
    };
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<IndexDetailsPageTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexDetailsPage, httpSetup, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();
  const { find, component, exists } = testBed;

  const errorSection = {
    isDisplayed: () => {
      return exists('indexDetailsErrorLoadingDetails');
    },
    clickReloadButton: async () => {
      await act(async () => {
        find('indexDetailsReloadDetailsButton').simulate('click');
      });
      component.update();
    },
  };
  const getHeader = () => {
    return component.find('[data-test-subj="indexDetailsHeader"] h1').text();
  };

  const clickIndexDetailsTab = async (tab: IndexDetailsSection) => {
    await act(async () => {
      find(`indexDetailsTab-${tab}`).simulate('click');
    });
    component.update();
  };

  const getActiveTabContent = () => {
    return find('indexDetailsContent').text();
  };

  const clickBackToIndicesButton = async () => {
    await act(async () => {
      find('indexDetailsBackToIndicesButton').simulate('click');
    });
    component.update();
  };

  const discoverLinkExists = () => {
    return exists('discoverButtonLink');
  };

  const indexStatsContentExists = () => {
    return exists('overviewTabIndexStats');
  };

  const indexDetailsContentExists = () => {
    return exists('overviewTabIndexDetails');
  };

  const addDocCodeBlockExists = () => {
    return exists('codeBlockControlsPanel');
  };

  const contextMenu = {
    clickManageIndexButton: async () => {
      await act(async () => {
        find('indexActionsContextMenuButton').simulate('click');
      });
      component.update();
    },
    isOpened: () => {
      return exists('indexContextMenu');
    },
  };
  return {
    ...testBed,
    routerMock,
    actions: {
      getHeader,
      clickIndexDetailsTab,
      getActiveTabContent,
      clickBackToIndicesButton,
      discoverLinkExists,
      indexStatsContentExists,
      indexDetailsContentExists,
      addDocCodeBlockExists,
      contextMenu,
      errorSection,
    },
  };
};
