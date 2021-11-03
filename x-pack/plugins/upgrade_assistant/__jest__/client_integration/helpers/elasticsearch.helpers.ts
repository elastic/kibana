/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { EsDeprecations } from '../../../public/application/components/es_deprecations';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/es_deprecations'],
    componentRoutePath: '/es_deprecations',
  },
  doMountAsync: true,
};

export type ElasticsearchTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { component, find } = testBed;

  /**
   * User Actions
   */
  const clickRefreshButton = async () => {
    await act(async () => {
      find('refreshButton').simulate('click');
    });

    component.update();
  };

  const clickMlDeprecationAt = async (index: number) => {
    await act(async () => {
      find('deprecation-mlSnapshot').at(index).simulate('click');
    });

    component.update();
  };

  const clickUpgradeMlSnapshot = async () => {
    await act(async () => {
      find('mlSnapshotDetails.upgradeSnapshotButton').simulate('click');
    });

    component.update();
  };

  const clickDeleteMlSnapshot = async () => {
    await act(async () => {
      find('mlSnapshotDetails.deleteSnapshotButton').simulate('click');
    });

    component.update();
  };

  const clickIndexSettingsDeprecationAt = async (index: number) => {
    await act(async () => {
      find('deprecation-indexSetting').at(index).simulate('click');
    });

    component.update();
  };

  const clickDeleteSettingsButton = async () => {
    await act(async () => {
      find('deleteSettingsButton').simulate('click');
    });

    component.update();
  };

  const clickReindexDeprecationAt = async (index: number) => {
    await act(async () => {
      find('deprecation-reindex').at(index).simulate('click');
    });

    component.update();
  };

  const clickDefaultDeprecationAt = async (index: number) => {
    await act(async () => {
      find('deprecation-default').at(index).simulate('click');
    });

    component.update();
  };

  const clickCriticalFilterButton = async () => {
    await act(async () => {
      // EUI doesn't support data-test-subj's on the filter buttons, so we must access via CSS selector
      find('searchBarContainer').find('.euiFilterButton').at(0).simulate('click');
    });

    component.update();
  };

  const clickTypeFilterDropdownAt = async (index: number) => {
    await act(async () => {
      // EUI doesn't support data-test-subj's on the filter buttons, so we must access via CSS selector
      find('searchBarContainer')
        .find('.euiPopover')
        .find('.euiFilterButton')
        .at(index)
        .simulate('click');
    });

    component.update();
  };

  const setSearchInputValue = async (searchValue: string) => {
    await act(async () => {
      find('searchBarContainer')
        .find('input')
        .simulate('keyup', { target: { value: searchValue } });
    });

    component.update();
  };

  const clickPaginationAt = async (index: number) => {
    await act(async () => {
      find(`pagination-button-${index}`).simulate('click');
    });

    component.update();
  };

  const clickRowsPerPageDropdown = async () => {
    await act(async () => {
      find('tablePaginationPopoverButton').simulate('click');
    });

    component.update();
  };

  return {
    clickRefreshButton,
    clickMlDeprecationAt,
    clickUpgradeMlSnapshot,
    clickDeleteMlSnapshot,
    clickIndexSettingsDeprecationAt,
    clickDeleteSettingsButton,
    clickReindexDeprecationAt,
    clickDefaultDeprecationAt,
    clickCriticalFilterButton,
    clickTypeFilterDropdownAt,
    setSearchInputValue,
    clickPaginationAt,
    clickRowsPerPageDropdown,
  };
};

export const setup = async (overrides?: Record<string, unknown>): Promise<ElasticsearchTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(EsDeprecations, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
