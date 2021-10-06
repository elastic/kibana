/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { EngineLogic } from '../../../engine';
import { Result } from '../../../result/types';
import { CurationSuggestion } from '../../types';

interface CurationSuggestionValues {
  dataLoading: boolean;
  suggestion: CurationSuggestion | null;
  suggestedPromotedDocuments: Result[];
}

interface CurationSuggestionActions {
  loadSuggestion(): void;
  onSuggestionLoaded({
    suggestion,
    suggestedPromotedDocuments,
  }: {
    suggestion: CurationSuggestion;
    suggestedPromotedDocuments: Result[];
  }): {
    suggestion: CurationSuggestion;
    suggestedPromotedDocuments: Result[];
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
    onSuggestionLoaded: ({ suggestion, suggestedPromotedDocuments }) => ({
      suggestion,
      suggestedPromotedDocuments,
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
  }),
  listeners: ({ actions, props }) => ({
    loadSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.post(
          `/internal/app_search/engines/${engineName}/search_relevance_suggestions/${props.query}`,
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

        const suggestion = response.results[0];

        const searchResponse = await http.post(
          `/internal/app_search/engines/${engineName}/search`,
          {
            query: { query: '' },
            body: JSON.stringify({
              page: {
                size: 100,
              },
              filters: {
                id: suggestion.promoted,
              },
            }),
          }
        );

        // Filter out docs that were not found and maintain promoted order
        const promotedIds: string[] = suggestion.promoted;
        const documentDetails = searchResponse.results;
        const suggestedPromotedDocuments = promotedIds.reduce((acc: Result[], id: string) => {
          const found = documentDetails.find(
            (documentDetail: Result) => documentDetail.id.raw === id
          );
          if (!found) return acc;
          return [...acc, found];
        }, []);

        actions.onSuggestionLoaded({
          suggestion: suggestion as CurationSuggestion,
          suggestedPromotedDocuments,
        });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
