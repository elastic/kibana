/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { cloneDeep } from 'lodash';
import { isEqual } from 'lodash';

import {
  clearFlashMessages,
  flashSuccessToast,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { AppLogic } from '../../app_logic';
import { SOURCE_RESTRICTIONS_SUCCESS_MESSAGE } from '../../constants';

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
  remote: PrivateSourceSection;
  standard: PrivateSourceSection;
}

interface SecurityValues extends SecurityServerProps {
  dataLoading: boolean;
  unsavedChanges: boolean;
  cachedServerState: SecurityServerProps;
}

interface SecurityActions {
  setServerProps(serverProps: SecurityServerProps): SecurityServerProps;
  setSourceRestrictionsUpdated(serverProps: SecurityServerProps): SecurityServerProps;
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

const route = '/internal/workplace_search/org/security/source_restrictions';

export const SecurityLogic = kea<MakeLogicType<SecurityValues, SecurityActions>>({
  path: ['enterprise_search', 'workplace_search', 'security_logic'],
  actions: {
    setServerProps: (serverProps: SecurityServerProps) => serverProps,
    setSourceRestrictionsUpdated: (serverProps: SecurityServerProps) => serverProps,
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
    initializeSourceRestrictions: async () => {
      const { http } = HttpLogic.values;

      try {
        const response = await http.get<SecurityServerProps>(route);
        actions.setServerProps(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveSourceRestrictions: async () => {
      const { isEnabled, remote, standard } = values;
      const serverData = { isEnabled, remote, standard };
      const body = JSON.stringify(serverData);
      const { http } = HttpLogic.values;

      try {
        const response = await http.patch<SecurityServerProps>(route, { body });
        actions.setSourceRestrictionsUpdated(response);
        flashSuccessToast(SOURCE_RESTRICTIONS_SUCCESS_MESSAGE);
        AppLogic.actions.setSourceRestriction(isEnabled);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    resetState: () => {
      actions.setServerProps(cloneDeep(values.cachedServerState));
      clearFlashMessages();
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
