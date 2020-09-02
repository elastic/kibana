/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea } from 'kea';

import { formatApiName } from '../../utils';
import { ADMIN, PRIVATE } from '../../constants/credentials';

import { HttpLogic } from '../../../shared/http';
import {
  IApiToken,
  IMeta,
  IEngine,
  ICredentialsDetails,
} from '../../../../../common/types/app_search';

const defaultApiToken = {
  name: '',
  type: PRIVATE,
  read: true,
  write: true,
  access_all_engines: true,
};

// TODO CREATE_MESSAGE, UPDATE_MESSAGE, and DELETE_MESSAGE from ent-search

export const apiTokenSort = (apiTokenA, apiTokenB) => {
  if (!apiTokenA.id) {
    return -1;
  }
  if (!apiTokenB.id) {
    return 1;
  }
  return apiTokenA.id - apiTokenB.id;
};

export interface ICredentialsLogicActions {
  deleteApiKey(tokenName: string);
  fetchCredentials(page: number);
  fetchDetails();
  hideCredentialsForm();
  initializeCredentialsData();
  onApiTokenChange();
  onEngineSelect(engineName: string);
  resetCredentials();
  setAccessAllEngines(accessAll: boolean);
  setNameInputBlurred(isBlurred: boolean);
  setTokenName(name: string);
  setTokenReadWrite(target: object);
  setTokenType(tokenType: string);
  toggleCredentialsForm(apiToken?: IApiToken);
}

export interface ICredentialsLogicValues {
  activeApiToken: IApiToken;
  activeApiTokenIsExisting: boolean;
  activeApiTokenRawName: string;
  apiTokens: IApiToken[];
  apiUrl: string;
  dataLoading: boolean;
  engines: IEngine[];
  // TODO flashMessages from ent-search
  formErrors: string[];
  fullEngineAccessChecked: boolean;
  keyHelpText: string;
  meta: IMeta;
  nameInputBlurred: boolean;
  showCredentialsForm: boolean;
}

export const CredentialsLogic = kea({
  path: ['enterprise_search', 'app_search', 'credentials'],
  actions: () => ({
    addEngineName: (engineName: string) => engineName,
    onApiKeyDelete: (tokenName: string) => tokenName,
    onApiTokenCreateSuccess: (apiToken: IApiToken) => apiToken,
    onApiTokenError: (formErrors: string[]) => formErrors,
    onApiTokenUpdateSuccess: (apiToken: IApiToken) => apiToken,
    removeEngineName: (engineName: string) => engineName,
    setAccessAllEngines: (accessAll: boolean) => accessAll,
    setCredentialsData: (meta: IMeta, apiTokens: IApiToken[]) => ({ meta, apiTokens }),
    setCredentialsDetails: (details: ICredentialsDetails) => details,
    setNameInputBlurred: (nameInputBlurred: boolean) => nameInputBlurred,
    setTokenReadWrite: ({ name, checked }) => ({ name, checked }),
    // TODO setFlashMessages from ent-search
    setTokenName: (name: string) => name,
    setTokenType: (tokenType: string) => tokenType,
    toggleCredentialsForm: (apiToken: IApiToken = { ...defaultApiToken }) => apiToken,
    hideCredentialsForm: false,
    resetCredentials: false,
    initializeCredentialsData: true,
    fetchCredentials: (page) => page,
    fetchDetails: true,
    deleteApiKey: (tokenName) => tokenName,
    onApiTokenChange: true,
    onEngineSelect: (engineName) => engineName,
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
      '',
      {
        setCredentialsData: (_, { meta }) => meta,
      },
    ],
    isCredentialsDetailsComplete: [
      false,
      {
        setCredentialsData: () => true,
        resetCredentials: () => false,
      },
    ],
    isCredentialsDataComplete: [
      false,
      {
        setCredentialsDetails: () => true,
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
    apiUrl: [
      '',
      {
        setCredentialsDetails: (_, { apiUrl }) => apiUrl,
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
          access_all_engines:
            tokenType === ADMIN
              ? false
              : activeApiToken.type === ADMIN || activeApiToken.access_all_engines,
          engines: tokenType === ADMIN ? [] : activeApiToken.engines,
          write: tokenType === PRIVATE,
          read: tokenType === PRIVATE,
          type: tokenType,
        }),
        toggleCredentialsForm: (_, activeApiToken) => activeApiToken || defaultApiToken,
      },
    ],
    activeApiTokenRawName: [
      '',
      {
        setTokenName: (_, activeApiTokenRawName) => activeApiTokenRawName,
        toggleCredentialsForm: (activeApiTokenRawName, activeApiToken) =>
          activeApiToken.name || activeApiTokenRawName,
        hideCredentialsForm: () => '',
        onApiTokenCreateSuccess: () => '',
        onApiTokenUpdateSuccess: () => '',
      },
    ],
    activeApiTokenIsExisting: [
      false,
      {
        toggleCredentialsForm: (_, activeApiToken) => !!activeApiToken.id,
      },
    ],
    showCredentialsForm: [
      false,
      {
        toggleCredentialsForm: (showCredentialsForm) => !showCredentialsForm,
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
        toggleCredentialsForm: () => [],
        resetCredentials: () => [],
      },
    ],
    // TODO flashMessages from ent-search
  }),
  selectors: ({ selectors }) => ({
    // TODO fullEngineAccessChecked from ent-search
    dataLoading: [
      () => [selectors.isCredentialsDetailsComplete, selectors.isCredentialsDataComplete],
      (isCredentialsDetailsComplete, isCredentialsDataComplete) => {
        return isCredentialsDetailsComplete === false || isCredentialsDataComplete === false;
      },
    ],
    keyHelpText: [
      () => [selectors.activeApiToken, selectors.activeApiTokenRawName],
      (activeApiToken, activeApiTokenRawName) => {
        const { name } = activeApiToken;
        if (!!name && name !== activeApiTokenRawName) {
          return `Your key will be named: ${name}`;
        }
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeCredentialsData: () => {
      actions.fetchCredentials();
      actions.fetchDetails();
    },
    fetchCredentials: (page = 1) => {
      HttpLogic.values.http
        .get(`/api/app_search/credentials`, {
          query: {
            'page[current]': page,
          },
        })
        .then(({ meta, results }) => {
          actions.setCredentialsData(meta, results);
        });
      // TODO handle errors
    },
    fetchDetails: () => {
      HttpLogic.values.http
        .get('/api/app_search/credentials/details')
        .then((data) => actions.setCredentialsDetails(data));
      // TODO handle errors - see ent-search
    },
    deleteApiKey: (tokenName) => {
      HttpLogic.values.http
        .delete(`/api/app_search/credentials/${tokenName}`)
        .then(() => actions.onApiKeyDelete(tokenName));
      // TODO handle errors - see ent-search
    },
    // TODO onApiTokenChange from ent-search
  }),
});
