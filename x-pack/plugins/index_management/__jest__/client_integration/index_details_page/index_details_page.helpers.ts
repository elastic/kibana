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
import { testIndexName } from './mocks';

let routerMock: typeof reactRouterMock;
const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/indices/${testIndexName}`],
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
    mappings: {
      getCodeBlockContent: () => string;
      getDocsLinkHref: () => string;
      isErrorDisplayed: () => boolean;
      clickErrorReloadButton: () => Promise<void>;
    };
    clickBackToIndicesButton: () => Promise<void>;
    discoverLinkExists: () => boolean;
    overview: {
      indexStatsContentExists: () => boolean;
      indexDetailsContentExists: () => boolean;
      addDocCodeBlockExists: () => boolean;
    };
    contextMenu: {
      clickManageIndexButton: () => Promise<void>;
      isOpened: () => boolean;
      clickIndexAction: (indexAction: string) => Promise<void>;
      confirmForcemerge: (numSegments: string) => Promise<void>;
      confirmDelete: () => Promise<void>;
    };
    errorSection: {
      isDisplayed: () => boolean;
      clickReloadButton: () => Promise<void>;
    };
    stats: {
      getCodeBlockContent: () => string;
      getDocsLinkHref: () => string;
      isErrorDisplayed: () => boolean;
      clickErrorReloadButton: () => Promise<void>;
      indexStatsTabExists: () => boolean;
      isWarningDisplayed: () => boolean;
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

  const mappings = {
    getCodeBlockContent: () => {
      return find('indexDetailsMappingsCodeBlock').text();
    },
    getDocsLinkHref: () => {
      return find('indexDetailsMappingsDocsLink').prop('href');
    },
    isErrorDisplayed: () => {
      return exists('indexDetailsMappingsError');
    },
    clickErrorReloadButton: async () => {
      await act(async () => {
        find('indexDetailsMappingsReloadButton').simulate('click');
      });
      component.update();
    },
  };

  const overview = {
    indexStatsContentExists: () => {
      return exists('overviewTabIndexStats');
    },
    indexDetailsContentExists: () => {
      return exists('overviewTabIndexDetails');
    },
    addDocCodeBlockExists: () => {
      return exists('codeBlockControlsPanel');
    },
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
    clickIndexAction: async (indexAction: string) => {
      await act(async () => {
        find(`indexContextMenu.${indexAction}`).simulate('click');
      });
      component.update();
    },
    confirmForcemerge: async (numSegments: string) => {
      await act(async () => {
        testBed.form.setInputValue('indexActionsForcemergeNumSegments', numSegments);
      });
      component.update();
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      component.update();
    },
    confirmDelete: async () => {
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      component.update();
    },
  };

  const stats = {
    indexStatsTabExists: () => {
      return exists('indexDetailsTab-stats');
    },
    getCodeBlockContent: () => {
      return find('indexDetailsStatsCodeBlock').text();
    },
    getDocsLinkHref: () => {
      return find('indexDetailsStatsDocsLink').prop('href');
    },
    isErrorDisplayed: () => {
      return exists('indexDetailsStatsError');
    },
    isWarningDisplayed: () => {
      return exists('indexStatsNotAvailableWarning');
    },
    clickErrorReloadButton: async () => {
      await act(async () => {
        find('reloadIndexStatsButton').simulate('click');
      });
      component.update();
    },
  };
  return {
    ...testBed,
    routerMock,
    actions: {
      getHeader,
      clickIndexDetailsTab,
      getActiveTabContent,
      mappings,
      clickBackToIndicesButton,
      discoverLinkExists,
      overview,
      contextMenu,
      errorSection,
      stats,
    },
  };
};
