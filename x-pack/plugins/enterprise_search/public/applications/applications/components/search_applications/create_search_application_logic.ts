/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { KibanaLogic } from '../../../shared/kibana';

import {
  CreateSearchApplicationApiLogic,
  CreateSearchApplicationApiLogicActions,
} from '../../api/search_applications/create_search_application_api_logic';
import { SEARCH_APPLICATIONS_PATH } from '../../routes';

import { SearchApplicationsListLogic } from './search_applications_list_logic';

export interface CreateSearchApplicationLogicActions {
  createSearchApplication: () => void;
  createSearchApplicationRequest: CreateSearchApplicationApiLogicActions['makeRequest'];
  fetchSearchApplications: () => void;
  searchApplicationCreateError: CreateSearchApplicationApiLogicActions['apiError'];
  searchApplicationCreated: CreateSearchApplicationApiLogicActions['apiSuccess'];
  setName: (name: string) => { name: string };
  setSelectedIndices: (indices: string[]) => {
    indices: string[];
  };
}

export interface CreateSearchApplicationLogicValues {
  createDisabled: boolean;
  createSearchApplicationError?: typeof CreateSearchApplicationApiLogic.values.error;
  createSearchApplicationStatus: typeof CreateSearchApplicationApiLogic.values.status;
  formDisabled: boolean;
  indicesStatus: 'complete' | 'incomplete';
  searchApplicationName: string;
  searchApplicationNameStatus: 'complete' | 'incomplete';
  selectedIndices: string[];
}

export const CreateSearchApplicationLogic = kea<
  MakeLogicType<CreateSearchApplicationLogicValues, CreateSearchApplicationLogicActions>
>({
  actions: {
    createSearchApplication: true,
    setName: (name: string) => ({ name }),
    setSelectedIndices: (indices: string[]) => ({ indices }),
  },
  connect: {
    actions: [
      SearchApplicationsListLogic,
      ['fetchSearchApplications'],
      CreateSearchApplicationApiLogic,
      [
        'makeRequest as createSearchApplicationRequest',
        'apiSuccess as searchApplicationCreated',
        'apiError as searchApplicationCreateError',
      ],
    ],
    values: [
      CreateSearchApplicationApiLogic,
      ['status as createSearchApplicationStatus', 'error as createSearchApplicationError'],
    ],
  },
  listeners: ({ actions, values }) => ({
    createSearchApplication: () => {
      actions.createSearchApplicationRequest({
        indices: values.selectedIndices,
        name: values.searchApplicationName,
      });
    },
    searchApplicationCreated: () => {
      actions.fetchSearchApplications();
      KibanaLogic.values.navigateToUrl(SEARCH_APPLICATIONS_PATH);
    },
  }),
  path: ['enterprise_search', 'content', 'create_search_application_logic'],
  reducers: {
    searchApplicationName: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setName: (_, { name }) => name,
      },
    ],
    selectedIndices: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setSelectedIndices: (_, { indices }) => indices,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    createDisabled: [
      () => [selectors.indicesStatus, selectors.searchApplicationNameStatus],
      (
        indicesStatus: CreateSearchApplicationLogicValues['indicesStatus'],
        searchApplicationNameStatus: CreateSearchApplicationLogicValues['searchApplicationNameStatus']
      ) => indicesStatus !== 'complete' || searchApplicationNameStatus !== 'complete',
    ],
    searchApplicationNameStatus: [
      () => [selectors.searchApplicationName],
      (searchApplicationName: string) => {
        if (searchApplicationName.length === 0) return 'incomplete';
        return 'complete';
      },
    ],
    formDisabled: [
      () => [selectors.createSearchApplicationStatus],
      (
        createSearchApplicationStatus: CreateSearchApplicationLogicValues['createSearchApplicationStatus']
      ) => createSearchApplicationStatus === Status.LOADING,
    ],
    indicesStatus: [
      () => [selectors.selectedIndices],
      (selectedIndices: CreateSearchApplicationLogicValues['selectedIndices']) =>
        selectedIndices.length > 0 ? 'complete' : 'incomplete',
    ],
  }),
});
