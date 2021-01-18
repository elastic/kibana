/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { isEqual } from 'lodash';

import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import { handleAPIError } from 'app_search/utils/handleAPIError';
import { IFlashMessagesProps } from 'shared/types';

import { AppLogic } from 'workplace_search/App';

export interface PrivateSource {
  id: string;
  name: string;
  isEnabled: boolean;
}

export interface PrivateSourceSection {
  isEnabled: boolean;
  contentSources: PrivateSource[];
}

export interface SecurityServerProps {
  isEnabled: boolean;
  isLocked: boolean;
  remote: PrivateSourceSection;
  standard: PrivateSourceSection;
}

interface SecurityValues extends SecurityServerProps {
  dataLoading: boolean;
  flashMessages: IFlashMessagesProps;
  unsavedChanges: boolean;
  cachedServerState: SecurityServerProps;
}

interface SecurityActions {
  setServerProps(serverProps: SecurityServerProps): SecurityServerProps;
  setSourceRestrictionsUpdated(serverProps: SecurityServerProps): SecurityServerProps;
  setFlashMessages(flashMessages: IFlashMessagesProps): { flashMessages: IFlashMessagesProps };
  initializeSourceRestrictions(): void;
  saveSourceRestrictions(): void;
  updatePrivateSourcesEnabled(isEnabled: boolean): { isEnabled: boolean };
  updateRemoteEnabled(isEnabled: boolean): { isEnabled: boolean };
  updateRemoteSource(
    sourceId: string,
    isEnabled: boolean
  ): { sourceId: string; isEnabled: boolean };
  updateStandardEnabled(isEnabled: boolean): { isEnabled: boolean };
  updateStandardSource(
    sourceId: string,
    isEnabled: boolean
  ): { sourceId: string; isEnabled: boolean };
  resetState(): void;
}

const route = routes.fritoPieOrganizationSecuritySourceRestrictionsPath();

export const SecurityLogic = kea<MakeLogicType<SecurityValues, SecurityActions>>({
  path: ['enterprise_search', 'workplace_search', 'security_logic'],
  actions: {
    setServerProps: (serverProps: SecurityServerProps) => serverProps,
    setSourceRestrictionsUpdated: (serverProps: SecurityServerProps) => serverProps,
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
    initializeSourceRestrictions: () => true,
    saveSourceRestrictions: () => null,
    updatePrivateSourcesEnabled: (isEnabled: boolean) => ({ isEnabled }),
    updateRemoteEnabled: (isEnabled: boolean) => ({ isEnabled }),
    updateRemoteSource: (sourceId: string, isEnabled: boolean) => ({ sourceId, isEnabled }),
    updateStandardEnabled: (isEnabled: boolean) => ({ isEnabled }),
    updateStandardSource: (sourceId: string, isEnabled: boolean) => ({ sourceId, isEnabled }),
    resetState: () => null,
  },
  reducers: {
    dataLoading: [
      true,
      {
        setServerProps: () => false,
      },
    ],
    cachedServerState: [
      {} as SecurityServerProps,
      {
        setServerProps: (_, serverProps) => cloneDeep(serverProps),
        setSourceRestrictionsUpdated: (_, serverProps) => cloneDeep(serverProps),
      },
    ],
    isEnabled: [
      false,
      {
        setServerProps: (_, { isEnabled }) => isEnabled,
        setSourceRestrictionsUpdated: (_, { isEnabled }) => isEnabled,
        updatePrivateSourcesEnabled: (_, { isEnabled }) => isEnabled,
      },
    ],
    isLocked: [
      false,
      {
        setServerProps: (_, { isLocked }) => isLocked,
        setSourceRestrictionsUpdated: (_, { isLocked }) => isLocked,
      },
    ],
    remote: [
      {} as PrivateSourceSection,
      {
        setServerProps: (_, { remote }) => remote,
        setSourceRestrictionsUpdated: (_, { remote }) => remote,
        updateRemoteEnabled: (state, { isEnabled }) => ({ ...state, isEnabled }),
        updateRemoteSource: (state, { sourceId, isEnabled }) =>
          updateSourceEnabled(state, sourceId, isEnabled),
      },
    ],
    standard: [
      {} as PrivateSourceSection,
      {
        setServerProps: (_, { standard }) => standard,
        setSourceRestrictionsUpdated: (_, { standard }) => standard,
        updateStandardEnabled: (state, { isEnabled }) => ({ ...state, isEnabled }),
        updateStandardSource: (state, { sourceId, isEnabled }) =>
          updateSourceEnabled(state, sourceId, isEnabled),
      },
    ],
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        setSourceRestrictionsUpdated: () => ({
          success: ['Successfully updated source restrictions.'],
        }),
      },
    ],
  },
  selectors: ({ selectors }) => ({
    unsavedChanges: [
      () => [
        selectors.cachedServerState,
        selectors.isEnabled,
        selectors.remote,
        selectors.standard,
      ],
      (cached, isEnabled, remote, standard) =>
        cached.isEnabled !== isEnabled ||
        !isEqual(cached.remote, remote) ||
        !isEqual(cached.standard, standard),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeSourceRestrictions: () => {
      http(route)
        .then(({ data }) => actions.setServerProps(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    saveSourceRestrictions: () => {
      const { isEnabled, remote, standard } = values;
      const serverData = { isEnabled, remote, standard };

      http
        .patch(route, serverData)
        .then(({ data }) => {
          actions.setSourceRestrictionsUpdated(data);
          AppLogic.actions.setSourceRestriction(isEnabled);
        })
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    resetState: () => {
      actions.setServerProps(cloneDeep(values.cachedServerState));
      actions.setFlashMessages({});
    },
  }),
});

const updateSourceEnabled = (
  section: PrivateSourceSection,
  id: string,
  isEnabled: boolean
): PrivateSourceSection => {
  const updatedSection = { ...section };
  const sources = updatedSection.contentSources;
  const sourceIndex = sources.findIndex((source) => source.id === id);
  updatedSection.contentSources[sourceIndex] = { ...sources[sourceIndex], isEnabled };

  return updatedSection;
};
