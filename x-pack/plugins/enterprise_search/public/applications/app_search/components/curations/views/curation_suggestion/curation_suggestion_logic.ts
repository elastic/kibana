/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpSetup } from '@kbn/core/public';

import { i18n } from '@kbn/i18n';

import {
  flashAPIErrors,
  setErrorMessage,
  setQueuedErrorMessage,
  setQueuedSuccessMessage,
} from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { ENGINE_CURATIONS_PATH, ENGINE_CURATION_PATH } from '../../../../routes';
import { EngineLogic, generateEnginePath } from '../../../engine';
import { CurationSuggestion, HydratedCurationSuggestion } from '../../types';

interface APIResponseError {
  error: string;
}
interface CurationSuggestionValues {
  dataLoading: boolean;
  suggestion: HydratedCurationSuggestion | null;
}

interface CurationSuggestionActions {
  loadSuggestion(): void;
  onSuggestionLoaded({ suggestion }: { suggestion: HydratedCurationSuggestion }): {
    suggestion: HydratedCurationSuggestion;
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
    onSuggestionLoaded: ({ suggestion }) => ({
      suggestion,
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
  }),
  listeners: ({ actions, values, props }) => ({
    loadSuggestion: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestionResponse = await http.get<any>(
          `/internal/app_search/engines/${engineName}/adaptive_relevance/suggestions/${props.query}`,
          {
            query: {
              type: 'curation',
            },
          }
        );

        // We pull the `organic` and `promoted` fields up to the main body of the suggestion,
        // out of the nested `suggestion` field on the response
        const { suggestion, ...baseSuggestion } = suggestionResponse;
        const suggestionData = {
          ...baseSuggestion,
          promoted: suggestion.promoted,
          organic: suggestion.organic,
        };

        actions.onSuggestionLoaded({
          suggestion: suggestionData,
        });
      } catch (e) {
        if (e.response?.status === 404) {
          const message = i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.notFoundError',
            {
              defaultMessage:
                'Could not find suggestion, it may have already been applied or rejected.',
            }
          );
          setQueuedErrorMessage(message);
          KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
        } else {
          flashAPIErrors(e);
        }
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
            { defaultMessage: 'Suggestion was successfully applied.' }
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
        if (e.message) {
          setErrorMessage(e.message);
        } else {
          flashAPIErrors(e);
        }
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
                'Suggestion was successfully applied and all future suggestions for the query "{query}" will be automatically applied.',
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
        if (e.message) {
          setErrorMessage(e.message);
        } else {
          flashAPIErrors(e);
        }
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
              defaultMessage: 'Suggestion was successfully rejected.',
            }
          )
        );
        KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
      } catch (e) {
        if (e.message) {
          setErrorMessage(e.message);
        } else {
          flashAPIErrors(e);
        }
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
                'Suggestion was successfully rejected and you will no longer receive suggestions for the query "{query}".',
              values: { query: suggestion!.query },
            }
          )
        );
        KibanaLogic.values.navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
      } catch (e) {
        if (e.message) {
          setErrorMessage(e.message);
        } else {
          flashAPIErrors(e);
        }
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
  const response = await http.put<{ results: Array<CurationSuggestion | APIResponseError> }>(
    `/internal/app_search/engines/${engineName}/adaptive_relevance/suggestions`,
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
    throw new Error((response.results[0] as APIResponseError).error);
  }

  return response.results[0] as CurationSuggestion;
};

const confirmDialog = (msg: string) => {
  return new Promise(function (resolve) {
    const confirmed = window.confirm(msg);
    return resolve(confirmed);
  });
};
