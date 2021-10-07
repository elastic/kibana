/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { HttpSetup } from 'kibana/public';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { EngineLogic } from '../../../engine';
import { Result } from '../../../result/types';
import { Curation, CurationSuggestion } from '../../types';

interface CurationSuggestionValues {
  dataLoading: boolean;
  suggestion: CurationSuggestion | null;
  suggestedPromotedDocuments: Result[];
  curation: Curation | null;
}

interface CurationSuggestionActions {
  loadSuggestion(): void;
  onSuggestionLoaded({
    suggestion,
    suggestedPromotedDocuments,
    curation,
  }: {
    suggestion: CurationSuggestion;
    suggestedPromotedDocuments: Result[];
    curation: Curation;
  }): {
    suggestion: CurationSuggestion;
    suggestedPromotedDocuments: Result[];
    curation: Curation;
  };
}

interface CurationSuggestionProps {
  query: CurationSuggestion['query'];
}

export const CurationSuggestionLogic = kea<
  MakeLogicType<CurationSuggestionValues, CurationSuggestionActions, CurationSuggestionProps>
>({
  path: ['enterprise_search', 'app_search', 'curations', 'suggestion_logic'],
  actions: () => ({
    loadSuggestion: true,
    onSuggestionLoaded: ({ suggestion, suggestedPromotedDocuments, curation }) => ({
      suggestion,
      suggestedPromotedDocuments,
      curation,
    }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadSuggestion: () => true,
        onSuggestionLoaded: () => false,
      },
    ],
    suggestion: [
      null,
      {
        onSuggestionLoaded: (_, { suggestion }) => suggestion,
      },
    ],
    suggestedPromotedDocuments: [
      [],
      {
        onSuggestionLoaded: (_, { suggestedPromotedDocuments }) => suggestedPromotedDocuments,
      },
    ],
    curation: [
      null,
      {
        onSuggestionLoaded: (_, { curation }) => curation,
      },
    ],
  }),
  listeners: ({ actions, props }) => ({
    loadSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const suggestion = await getSuggestions(http, engineName, props.query);
        const promotedIds: string[] = suggestion.promoted;
        const documentDetailsResopnse = getDocumentDetails(http, engineName, promotedIds);

        let promises = [documentDetailsResopnse];
        if (suggestion.curation_id) {
          promises = [...promises, getCuration(http, engineName, suggestion.curation_id)];
        }

        const [documentDetails, curation] = await Promise.all(promises);

        // Filter out docs that were not found and maintain promoted order
        const suggestedPromotedDocuments = promotedIds.reduce((acc: Result[], id: string) => {
          const found = documentDetails.results.find(
            (documentDetail: Result) => documentDetail.id.raw === id
          );
          if (!found) return acc;
          return [...acc, found];
        }, []);

        actions.onSuggestionLoaded({
          suggestion,
          suggestedPromotedDocuments,
          curation: curation || null,
        });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});

const getSuggestions = async (
  http: HttpSetup,
  engineName: string,
  query: string
): Promise<CurationSuggestion> => {
  const response = await http.post(
    `/internal/app_search/engines/${engineName}/search_relevance_suggestions/${query}`,
    {
      body: JSON.stringify({
        page: {
          current: 1,
          size: 1,
        },
        filters: {
          status: ['pending'],
          type: 'curation',
        },
      }),
    }
  );

  const suggestion = response.results[0] as CurationSuggestion;
  return suggestion;
};

const getDocumentDetails = async (http: HttpSetup, engineName: string, documentIds: string[]) => {
  return http.post(`/internal/app_search/engines/${engineName}/search`, {
    query: { query: '' },
    body: JSON.stringify({
      page: {
        size: 100,
      },
      filters: {
        id: documentIds,
      },
    }),
  });
};

const getCuration = async (http: HttpSetup, engineName: string, curationId: string) => {
  return http.get(`/internal/app_search/engines/${engineName}/curations/${curationId}`, {
    query: { skip_record_analytics: 'true' },
  });
};
