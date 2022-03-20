/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';
import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';
import { KibanaDeprecations } from '../../../public/application/components';
import { WithAppDependencies } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: ['/kibana_deprecations'],
    componentRoutePath: '/kibana_deprecations',
  },
  doMountAsync: true,
};

export type KibanaTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { component, find, table } = testBed;

  /**
   * User Actions
   */
  const tableActions = {
    clickRefreshButton: async () => {
      await act(async () => {
        find('refreshButton').simulate('click');
      });

      component.update();
    },

    clickDeprecationAt: async (index: number) => {
      const { rows } = table.getMetaData('kibanaDeprecationsTable');

      const deprecationDetailsLink = findTestSubject(
        rows[index].reactWrapper,
        'deprecationDetailsLink'
      );

      await act(async () => {
        deprecationDetailsLink.simulate('click');
      });
      component.update();
    },
  };

  const searchBarActions = {
    openTypeFilterDropdown: async () => {
      await act(async () => {
        // EUI doesn't support data-test-subj's on the filter buttons, so we must access via CSS selector
        find('kibanaDeprecations')
          .find('.euiSearchBar__filtersHolder')
          .find('.euiPopover')
          .find('.euiFilterButton')
          .at(0)
          .simulate('click');
      });

      component.update();
    },

    clickCriticalFilterButton: async () => {
      await act(async () => {
        // EUI doesn't support data-test-subj's on the filter buttons, so we must access via CSS selector
        find('kibanaDeprecations')
          .find('.euiSearchBar__filtersHolder')
          .find('.euiFilterButton')
          .at(0)
          .simulate('click');
      });

      component.update();
    },

    filterByConfigType: async () => {
      // We need to read the document "body" as the filter dropdown (an EuiSelectable)
      // is added in a portalled popover and not inside the component DOM tree.
      // The "Config" option is expected to be the first item.
      const configTypeFilterButton: HTMLButtonElement | null = document.body.querySelector(
        '.euiSelectableList .euiSelectableListItem'
      );

      await act(async () => {
        configTypeFilterButton!.click();
      });

      component.update();
    },
  };

  const flyoutActions = {
    clickResolveButton: async () => {
      await act(async () => {
        find('resolveButton').simulate('click');
      });

      component.update();
    },
  };

  return {
    table: tableActions,
    flyout: flyoutActions,
    searchBar: searchBarActions,
  };
};

export const setupKibanaPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<KibanaTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(KibanaDeprecations, httpSetup, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
