/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
import { IndexList } from '../../../public/application/sections/home/index_list'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { indexManagementStore } from '../../../public/application/store'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: TestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/indices?includeHiddenIndices=true`],
    componentRoutePath: `/:section(indices|templates)`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(IndexList), testBedConfig);

export interface IndicesTestBed extends TestBed<TestSubjects> {
  actions: {
    selectIndexDetailsTab: (tab: 'settings' | 'mappings' | 'stats' | 'edit_settings') => void;
    getIncludeHiddenIndicesToggleStatus: () => boolean;
    clickIncludeHiddenIndicesToggle: () => void;
  };
}

export const setup = async (): Promise<IndicesTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const clickIncludeHiddenIndicesToggle = () => {
    const { find } = testBed;
    find('indexTableIncludeHiddenIndicesToggle').simulate('click');
  };

  const getIncludeHiddenIndicesToggleStatus = () => {
    const { find } = testBed;
    const props = find('indexTableIncludeHiddenIndicesToggle').props();
    return Boolean(props['aria-checked']);
  };

  const selectIndexDetailsTab = async (
    tab: 'settings' | 'mappings' | 'stats' | 'edit_settings'
  ) => {
    const indexDetailsTabs = ['settings', 'mappings', 'stats', 'edit_settings'];
    const { find, component } = testBed;
    await act(async () => {
      find('detailPanelTab').at(indexDetailsTabs.indexOf(tab)).simulate('click');
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      selectIndexDetailsTab,
      getIncludeHiddenIndicesToggleStatus,
      clickIncludeHiddenIndicesToggle,
    },
  };
};
