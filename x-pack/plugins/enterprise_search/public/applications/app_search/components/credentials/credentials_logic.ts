/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { formatApiName } from '../../utils/format_api_name';
import { ApiTokenTypes, CREATE_MESSAGE, UPDATE_MESSAGE, DELETE_MESSAGE } from './constants';

import { HttpLogic } from '../../../shared/http';
import {
  FlashMessagesLogic,
  setSuccessMessage,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { AppLogic } from '../../app_logic';

import { IMeta } from '../../../../../common/types';
import { IEngine } from '../../types';
import { IApiToken, ICredentialsDetails, ITokenReadWrite } from './types';

const defaultApiToken: IApiToken = {
  name: '',
  type: ApiTokenTypes.Private,
  read: true,
  write: true,
  access_all_engines: true,
};

interface ICredentialsLogicActions {
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
  onApiTokenChange(): void;
  onEngineSelect(engineName: string): string;
}

interface ICredentialsLogicValues {
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
    setTokenReadWrite: ({ name, checked }) => ({ name, checked }),
    setTokenName: (name) => name,
    setTokenType: (tokenType) => tokenType,
    showCredentialsForm: (apiToken = { ...defaultApiToken }) => apiToken,
    hideCredentialsForm: false,
    resetCredentials: false,
    initializeCredentialsData: true,
    fetchCredentials: (page) => page,
    fetchDetails: true,
    deleteApiKey: (tokenName) => tokenName,
    onApiTokenChange: () => null,
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
          access_all_engines:
            tokenType === ApiTokenTypes.Admin ? false : activeApiToken.access_all_engines,
          engines: tokenType === ApiTokenTypes.Admin ? [] : activeApiToken.engines,
          write: tokenType === ApiTokenTypes.Private,
          read: tokenType === ApiTokenTypes.Private,
          type: tokenType as ApiTokenTypes,
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
    fullEngineAccessChecked: [
      () => [AppLogic.selectors.myRole, selectors.activeApiToken],
      (myRole, activeApiToken) =>
        !!(myRole.canAccessAllEngines && activeApiToken.access_all_engines),
    ],
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
    showCredentialsForm: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
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
        setSuccessMessage(DELETE_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onApiTokenChange: async () => {
      const { id, name, engines, type, read, write } = values.activeApiToken;

      const data: IApiToken = {
        name,
        type,
      };
      if (type === ApiTokenTypes.Private) {
        data.read = read;
        data.write = write;
      }
      if (type !== ApiTokenTypes.Admin) {
        data.access_all_engines = values.fullEngineAccessChecked;
        data.engines = engines;
      }

      try {
        const { http } = HttpLogic.values;
        const body = JSON.stringify(data);

        if (id) {
          const response = await http.put(`/api/app_search/credentials/${name}`, { body });
          actions.onApiTokenUpdateSuccess(response);
          setSuccessMessage(UPDATE_MESSAGE);
        } else {
          const response = await http.post('/api/app_search/credentials', { body });
          actions.onApiTokenCreateSuccess(response);
          setSuccessMessage(CREATE_MESSAGE);
        }
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onEngineSelect: (engineName: string) => {
      if (values.activeApiToken?.engines?.includes(engineName)) {
        actions.removeEngineName(engineName);
      } else {
        actions.addEngineName(engineName);
      }
    },
  }),
});
