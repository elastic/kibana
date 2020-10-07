/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { formatApiName } from '../../utils/format_api_name';
import { ADMIN, PRIVATE } from './constants';

import { HttpLogic } from '../../../shared/http';
import { IMeta } from '../../../../../common/types';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { IEngine } from '../../types';
import { IApiToken, ICredentialsDetails, ITokenReadWrite } from './types';

const defaultApiToken: IApiToken = {
  name: '',
  type: PRIVATE,
  read: true,
  write: true,
  access_all_engines: true,
};

// TODO CREATE_MESSAGE, UPDATE_MESSAGE, and DELETE_MESSAGE from ent-search

export interface ICredentialsLogicActions {
  addEngineName(engineName: string): string;
  onApiKeyDelete(tokenName: string): string;
  onApiTokenCreateSuccess(apiToken: IApiToken): IApiToken;
  onApiTokenError(formErrors: string[]): string[];
  onApiTokenUpdateSuccess(apiToken: IApiToken): IApiToken;
  removeEngineName(engineName: string): string;
  setAccessAllEngines(accessAll: boolean): boolean;
  setCredentialsData(meta: IMeta, apiTokens: IApiToken[]): { meta: IMeta; apiTokens: IApiToken[] };
  setCredentialsDetails(details: ICredentialsDetails): ICredentialsDetails;
  setNameInputBlurred(isBlurred: boolean): boolean;
  setTokenReadWrite(tokenReadWrite: ITokenReadWrite): ITokenReadWrite;
  setTokenName(name: string): string;
  setTokenType(tokenType: string): string;
  showCredentialsForm(apiToken?: IApiToken): IApiToken;
  hideCredentialsForm(): { value: boolean };
  resetCredentials(): { value: boolean };
  initializeCredentialsData(): { value: boolean };
  fetchCredentials(page?: number): number;
  fetchDetails(): { value: boolean };
  deleteApiKey(tokenName: string): string;
}

export interface ICredentialsLogicValues {
  activeApiToken: IApiToken;
  activeApiTokenExists: boolean;
  activeApiTokenRawName: string;
  apiTokens: IApiToken[];
  dataLoading: boolean;
  engines: IEngine[];
  formErrors: string[];
  isCredentialsDataComplete: boolean;
  isCredentialsDetailsComplete: boolean;
  fullEngineAccessChecked: boolean;
  meta: Partial<IMeta>;
  nameInputBlurred: boolean;
  shouldShowCredentialsForm: boolean;
}

export const CredentialsLogic = kea<
  MakeLogicType<ICredentialsLogicValues, ICredentialsLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'credentials_logic'],
  actions: () => ({
    addEngineName: (engineName) => engineName,
    onApiKeyDelete: (tokenName) => tokenName,
    onApiTokenCreateSuccess: (apiToken) => apiToken,
    onApiTokenError: (formErrors) => formErrors,
    onApiTokenUpdateSuccess: (apiToken) => apiToken,
    removeEngineName: (engineName) => engineName,
    setAccessAllEngines: (accessAll) => accessAll,
    setCredentialsData: (meta, apiTokens) => ({ meta, apiTokens }),
    setCredentialsDetails: (details) => details,
    setNameInputBlurred: (nameInputBlurred) => nameInputBlurred,
    setTokenReadWrite: ({ name, checked }) => ({
      name,
      checked,
    }),
    setTokenName: (name) => name,
    setTokenType: (tokenType) => tokenType,
    showCredentialsForm: (apiToken = { ...defaultApiToken }) => apiToken,
    hideCredentialsForm: false,
    resetCredentials: false,
    initializeCredentialsData: true,
    fetchCredentials: (page) => page,
    fetchDetails: true,
    deleteApiKey: (tokenName) => tokenName,
  }),
  reducers: () => ({
    apiTokens: [
      [],
      {
        setCredentialsData: (_, { apiTokens }) => apiTokens,
        onApiTokenCreateSuccess: (apiTokens, apiToken) => [...apiTokens, apiToken],
        onApiTokenUpdateSuccess: (apiTokens, apiToken) => [
          ...apiTokens.filter((token) => token.name !== apiToken.name),
          apiToken,
        ],
        onApiKeyDelete: (apiTokens, tokenName) =>
          apiTokens.filter((token) => token.name !== tokenName),
      },
    ],
    meta: [
      {},
      {
        setCredentialsData: (_, { meta }) => meta,
      },
    ],
    isCredentialsDetailsComplete: [
      false,
      {
        setCredentialsDetails: () => true,
        resetCredentials: () => false,
      },
    ],
    isCredentialsDataComplete: [
      false,
      {
        setCredentialsData: () => true,
        resetCredentials: () => false,
      },
    ],
    engines: [
      [],
      {
        setCredentialsDetails: (_, { engines }) => engines,
      },
    ],
    nameInputBlurred: [
      false,
      {
        setNameInputBlurred: (_, nameInputBlurred) => nameInputBlurred,
      },
    ],
    activeApiToken: [
      defaultApiToken,
      {
        addEngineName: (activeApiToken, engineName) => ({
          ...activeApiToken,
          engines: [...(activeApiToken.engines || []), engineName],
        }),
        removeEngineName: (activeApiToken, engineName) => ({
          ...activeApiToken,
          engines: (activeApiToken.engines || []).filter((name) => name !== engineName),
        }),
        setAccessAllEngines: (activeApiToken, accessAll) => ({
          ...activeApiToken,
          access_all_engines: accessAll,
          engines: accessAll ? [] : activeApiToken.engines,
        }),
        onApiTokenCreateSuccess: () => defaultApiToken,
        onApiTokenUpdateSuccess: () => defaultApiToken,
        setTokenName: (activeApiToken, name) => ({ ...activeApiToken, name: formatApiName(name) }),
        setTokenReadWrite: (activeApiToken, { name, checked }) => ({
          ...activeApiToken,
          [name]: checked,
        }),
        setTokenType: (activeApiToken, tokenType) => ({
          ...activeApiToken,
          access_all_engines: tokenType === ADMIN ? false : activeApiToken.access_all_engines,
          engines: tokenType === ADMIN ? [] : activeApiToken.engines,
          write: tokenType === PRIVATE,
          read: tokenType === PRIVATE,
          type: tokenType,
        }),
        showCredentialsForm: (_, activeApiToken) => activeApiToken,
      },
    ],
    activeApiTokenRawName: [
      '',
      {
        setTokenName: (_, activeApiTokenRawName) => activeApiTokenRawName,
        showCredentialsForm: (_, activeApiToken) => activeApiToken.name,
        hideCredentialsForm: () => '',
        onApiTokenCreateSuccess: () => '',
        onApiTokenUpdateSuccess: () => '',
      },
    ],
    shouldShowCredentialsForm: [
      false,
      {
        showCredentialsForm: () => true,
        hideCredentialsForm: () => false,
        onApiTokenCreateSuccess: () => false,
        onApiTokenUpdateSuccess: () => false,
      },
    ],
    formErrors: [
      [],
      {
        onApiTokenError: (_, formErrors) => formErrors,
        onApiTokenCreateSuccess: () => [],
        showCredentialsForm: () => [],
        resetCredentials: () => [],
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    // TODO fullEngineAccessChecked from ent-search
    dataLoading: [
      () => [selectors.isCredentialsDetailsComplete, selectors.isCredentialsDataComplete],
      (isCredentialsDetailsComplete, isCredentialsDataComplete) => {
        return isCredentialsDetailsComplete === false || isCredentialsDataComplete === false;
      },
    ],
    activeApiTokenExists: [
      () => [selectors.activeApiToken],
      (activeApiToken) => !!activeApiToken.id,
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeCredentialsData: () => {
      actions.fetchCredentials();
      actions.fetchDetails();
    },
    fetchCredentials: async (page = 1) => {
      try {
        const { http } = HttpLogic.values;
        const query = { 'page[current]': page };
        const response = await http.get('/api/app_search/credentials', { query });
        actions.setCredentialsData(response.meta, response.results);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    fetchDetails: async () => {
      try {
        const { http } = HttpLogic.values;
        const response = await http.get('/api/app_search/credentials/details');

        actions.setCredentialsDetails(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteApiKey: async (tokenName) => {
      try {
        const { http } = HttpLogic.values;
        await http.delete(`/api/app_search/credentials/${tokenName}`);

        actions.onApiKeyDelete(tokenName);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    // TODO onApiTokenChange from ent-search
    // TODO onEngineSelect from ent-search
  }),
});
