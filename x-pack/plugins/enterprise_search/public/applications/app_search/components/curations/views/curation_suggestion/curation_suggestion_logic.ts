/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { HttpSetup } from 'kibana/public';

import { i18n } from '@kbn/i18n';

import {
  flashAPIErrors,
  setQueuedErrorMessage,
  setQueuedSuccessMessage,
} from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { ENGINE_CURATIONS_PATH, ENGINE_CURATION_PATH } from '../../../../routes';
import { EngineLogic, generateEnginePath } from '../../../engine';
import { Result } from '../../../result/types';
import { Curation, CurationSuggestion } from '../../types';

interface Error {
  error: string;
}
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
  acceptSuggestion(): void;
  acceptAndAutomateSuggestion(): void;
  rejectSuggestion(): void;
  rejectAndDisableSuggestion(): void;
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
    acceptSuggestion: true,
    acceptAndAutomateSuggestion: true,
    rejectSuggestion: true,
    rejectAndDisableSuggestion: true,
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
  listeners: ({ actions, values, props }) => ({
    loadSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const suggestion = await getSuggestion(http, engineName, props.query);
        if (!suggestion) return;
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
    acceptSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { suggestion } = values;

      if (suggestion!.operation === 'delete') {
        const confirmed = await confirmDialog('Are you sure you want to delete this curation?');
        if (!confirmed) return;
      }

      try {
        const updatedSuggestion = await updateSuggestion(
          http,
          engineName,
          suggestion!.query,
          'applied'
        );

        setQueuedSuccessMessage(
          i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.successfullyAppliedMessage',
            { defaultMessage: 'Suggestion was succefully applied.' }
          )
        );
        if (suggestion!.operation === 'delete') {
          // Because if a curation is deleted, there will be no curation detail page to navigate to afterwards.
          KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
        } else {
          KibanaLogic.values.navigateToUrl(
            generateEnginePath(ENGINE_CURATION_PATH, {
              curationId: updatedSuggestion.curation_id,
            })
          );
        }
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    acceptAndAutomateSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { suggestion } = values;

      if (suggestion!.operation === 'delete') {
        const confirmed = await confirmDialog('Are you sure you want to delete this curation?');
        if (!confirmed) return;
      }

      try {
        const updatedSuggestion = await updateSuggestion(
          http,
          engineName,
          suggestion!.query,
          'automated'
        );

        setQueuedSuccessMessage(
          i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.successfullyAutomatedMessage',
            {
              defaultMessage:
                'Suggestion was succefully applied and all future suggestions for the query "{query}" will be automatically applied.',
              values: { query: suggestion!.query },
            }
          )
        );
        if (suggestion!.operation === 'delete') {
          // Because if a curation is deleted, there will be no curation detail page to navigate to afterwards.
          KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
        } else {
          KibanaLogic.values.navigateToUrl(
            generateEnginePath(ENGINE_CURATION_PATH, {
              curationId: updatedSuggestion.curation_id,
            })
          );
        }
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    rejectSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { suggestion } = values;

      try {
        await updateSuggestion(http, engineName, suggestion!.query, 'rejected');

        setQueuedSuccessMessage(
          i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.successfullyRejectedMessage',
            {
              defaultMessage: 'Suggestion was succefully rejected.',
            }
          )
        );
        KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    rejectAndDisableSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { suggestion } = values;

      try {
        await updateSuggestion(http, engineName, suggestion!.query, 'disabled');

        setQueuedSuccessMessage(
          i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.successfullyDisabledMessage',
            {
              defaultMessage:
                'Suggestion was succefully rejected and you will no longer receive suggestions for the query "{query}".',
              values: { query: suggestion!.query },
            }
          )
        );
        KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});

const updateSuggestion = async (
  http: HttpSetup,
  engineName: string,
  query: string,
  status: string
) => {
  const response = await http.put<{ results: Array<CurationSuggestion | Error> }>(
    `/internal/app_search/engines/${engineName}/search_relevance_suggestions`,
    {
      body: JSON.stringify([
        {
          query,
          type: 'curation',
          status,
        },
      ]),
    }
  );

  if (response.results[0].hasOwnProperty('error')) {
    throw (response.results[0] as Error).error;
  }

  return response.results[0] as CurationSuggestion;
};

const getSuggestion = async (
  http: HttpSetup,
  engineName: string,
  query: string
): Promise<CurationSuggestion | undefined> => {
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

  if (response.results.length < 1) {
    const message = i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.notFoundError',
      {
        defaultMessage: 'Could not find suggestion, it may have already been applied or rejected.',
      }
    );
    setQueuedErrorMessage(message);
    KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
    return;
  }

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

const confirmDialog = (msg: string) => {
  return new Promise(function (resolve) {
    const confirmed = window.confirm(msg);
    return resolve(confirmed);
  });
};
