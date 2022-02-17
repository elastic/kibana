/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { EngineLogic } from '../engine';

import {
  SYNONYMS_PAGE_META,
  CREATE_SUCCESS,
  UPDATE_SUCCESS,
  DELETE_SUCCESS,
  SYNONYM_IMPACT_MESSAGE,
} from './constants';
import { SynonymSet, SynonymsApiResponse } from './types';

interface SynonymsValues {
  dataLoading: boolean;
  synonymSets: SynonymSet[];
  meta: Meta;
  isModalOpen: boolean;
  activeSynonymSet: SynonymSet | null;
  modalLoading: boolean;
}

interface SynonymsActions {
  loadSynonyms(): void;
  onSynonymsLoad(response: SynonymsApiResponse): SynonymsApiResponse;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  openModal(synonymSet: SynonymSet | null): { synonymSet: SynonymSet | null };
  closeModal(): void;
  createSynonymSet(synonyms: SynonymSet['synonyms']): { synonyms: SynonymSet['synonyms'] };
  updateSynonymSet(synonymSet: SynonymSet): SynonymSet;
  deleteSynonymSet(id: SynonymSet['id']): { id: SynonymSet['id'] };
  onSynonymSetSuccess(successMessage: string): { successMessage: string };
  onSynonymSetError(): void;
}

export const SynonymsLogic = kea<MakeLogicType<SynonymsValues, SynonymsActions>>({
  path: ['enterprise_search', 'app_search', 'synonyms_logic'],
  actions: () => ({
    loadSynonyms: true,
    onSynonymsLoad: ({ results, meta }) => ({ results, meta }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    openModal: (synonymSet) => ({ synonymSet }),
    closeModal: true,
    createSynonymSet: (synonyms) => ({ synonyms }),
    updateSynonymSet: ({ id, synonyms }) => ({ id, synonyms }),
    deleteSynonymSet: (id) => ({ id }),
    onSynonymSetSuccess: (successMessage) => ({ successMessage }),
    onSynonymSetError: true,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadSynonyms: () => true,
        onSynonymsLoad: () => false,
      },
    ],
    synonymSets: [
      [],
      {
        onSynonymsLoad: (_, { results }) => results,
      },
    ],
    meta: [
      SYNONYMS_PAGE_META,
      {
        onSynonymsLoad: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
    isModalOpen: [
      false,
      {
        openModal: () => true,
        closeModal: () => false,
      },
    ],
    activeSynonymSet: [
      null,
      {
        openModal: (_, { synonymSet }) => synonymSet,
        closeModal: () => null,
      },
    ],
    modalLoading: [
      false,
      {
        createSynonymSet: () => true,
        updateSynonymSet: () => true,
        deleteSynonymSet: () => true,
        onSynonymSetError: () => false,
        closeModal: () => false,
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    loadSynonyms: async () => {
      const { meta } = values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<SynonymsApiResponse>(
          `/internal/app_search/engines/${engineName}/synonyms`,
          {
            query: {
              'page[current]': meta.page.current,
              'page[size]': meta.page.size,
            },
          }
        );
        actions.onSynonymsLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    createSynonymSet: async ({ synonyms }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      clearFlashMessages();

      try {
        await http.post(`/internal/app_search/engines/${engineName}/synonyms`, {
          body: JSON.stringify({ synonyms }),
        });
        actions.onSynonymSetSuccess(CREATE_SUCCESS);
      } catch (e) {
        actions.onSynonymSetError();
        flashAPIErrors(e);
      }
    },
    updateSynonymSet: async ({ id, synonyms }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      clearFlashMessages();

      try {
        await http.put(`/internal/app_search/engines/${engineName}/synonyms/${id}`, {
          body: JSON.stringify({ synonyms }),
        });
        actions.onSynonymSetSuccess(UPDATE_SUCCESS);
      } catch (e) {
        actions.onSynonymSetError();
        flashAPIErrors(e);
      }
    },
    deleteSynonymSet: async ({ id }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      clearFlashMessages();

      try {
        await http.delete(`/internal/app_search/engines/${engineName}/synonyms/${id}`);
        actions.onSynonymSetSuccess(DELETE_SUCCESS);
      } catch (e) {
        actions.onSynonymSetError();
        flashAPIErrors(e);
      }
    },
    onSynonymSetSuccess: async ({ successMessage }) => {
      await actions.loadSynonyms();
      actions.closeModal();
      flashSuccessToast(successMessage, { text: SYNONYM_IMPACT_MESSAGE });
    },
  }),
});
