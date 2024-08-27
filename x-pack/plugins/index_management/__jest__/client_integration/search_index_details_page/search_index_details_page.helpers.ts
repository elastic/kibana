/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { act } from 'react-dom/test-utils';
import {
  AsyncTestBedConfig,
  reactRouterMock,
  registerTestBed,
  TestBed,
} from '@kbn/test-jest-helpers';
import { SearchIndexDetailsPage } from '../../../public/application/sections/home/index_list/details_page/search_index/search_index_details_page'
import { WithAppDependencies } from '../helpers';
import { testIndexName } from '../index_details_page/mocks';


let routerMock: typeof reactRouterMock;

const getTestBedConfig = (initialEntry?: string): AsyncTestBedConfig => ({
  memoryRouter: {
    initialEntries: [initialEntry ?? `/indices/search_index_details?indexName=${testIndexName}`],
    componentRoutePath: `/indices/search_index_details`,
    onRouter: (router) => {
      routerMock = router;
    },
  },
  doMountAsync: true,
});

export interface SearchIndexDetailsPageTestBed extends TestBed {
  routerMock: typeof reactRouterMock;
  actions: {
    moreOptionsContextMenu : {
      confirmDeleteIndex: () => Promise<void>;
      confirmDeleteIndexModalIsVisible: () => void;
      confirmMoreOptionsMenuItemsAreVisible: () => void;
      clickMoreOptionsButton: () => Promise<void>;
      clickDeleteIndexButton: () => Promise<void>;
    },
    clickBackToIndicesList: () => void;
    isBackToIndicesListButtonExists: () => boolean;
    getHeader: () => string;
  }

}
export const setup = async ({
  httpSetup,
  dependencies = {},
  initialEntry,
}: {
  httpSetup: HttpSetup;
  dependencies?: any;
  initialEntry?: string;
}): Promise<SearchIndexDetailsPageTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(SearchIndexDetailsPage, httpSetup, dependencies),
    getTestBedConfig(initialEntry)
  );
  const testBed = await initTestBed();
  const { find, component, exists } = testBed;
  const getHeader = () => {
    return component.find('[data-test-subj="searchIndexDetailsHeader"] h1').text();
  };
  const isBackToIndicesListButtonExists = () => {
    return exists('searchIndexDetailsBackToIndicesButton');
  };

  const clickBackToIndicesList = async() => {
    expect(exists('searchIndexDetailsBackToIndicesButton')).toBe(true);
    await(act(async()=>{
      find('searchIndexDetailsBackToIndicesButton').simulate('click');
    }));
    component.update()
  }
  const moreOptionsContextMenu = {
    clickMoreOptionsButton: async() => {
      expect(exists('searchIndexDetailsMoreOptionsButton')).toBe(true);
      await(act(async()=>{
        find('searchIndexDetailsMoreOptionsButton').simulate('click');
      }));
      component.update();
    },
    confirmMoreOptionsMenuItemsAreVisible: () => {
      expect(exists('searchIndexMoreOptionsMenu')).toBe(true);
      expect(exists('searchIndexDeleteButton')).toBe(true);
    },
    clickDeleteIndexButton: async() => {
      expect(exists('searchIndexDeleteButton')).toBe(true);
      await(act(async()=>{
        find('searchIndexDeleteButton').simulate('click');
      }));
      component.update();
    },
    confirmDeleteIndexModalIsVisible: () => {
      expect(exists('confirmModalTitleText')).toBe(true);
      expect(exists('confirmModalBodyText')).toBe(true);
      expect(exists('confirmModalCancelButton')).toBe(true);
      expect(exists('confirmModalConfirmButton')).toBe(true);
    },
    confirmDeleteIndex: async () => {
      expect(exists('confirmModalConfirmButton')).toBe(true);
      await(act(async()=>{
        find('confirmModalConfirmButton').simulate('click');
      }));
      component.update();
    }
  };

  return {
    ...testBed,
    routerMock,
    actions: {
      moreOptionsContextMenu,
      clickBackToIndicesList,
      isBackToIndicesListButtonExists,
      getHeader,

    }
  }
}
