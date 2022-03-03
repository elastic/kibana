/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import {
  flashAPIErrors,
  flashSuccessToast,
  clearFlashMessages,
} from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';

import { getAddPath, getSourcesPath } from '../../../../routes';

import { SourceConfigData } from './add_source_logic';

export interface ExternalConnectorActions {
  fetchExternalSource: () => true;
  fetchExternalSourceSuccess(sourceConfigData: SourceConfigData): SourceConfigData;
  saveExternalConnectorConfigSuccess(externalConnectorId: string): string;
  setExternalConnectorApiKey(externalConnectorApiKey: string): string;
  saveExternalConnectorConfig(config: ExternalConnectorConfig): ExternalConnectorConfig;
  setExternalConnectorUrl(externalConnectorUrl: string): string;
  resetSourceState: () => true;
}

export interface ExternalConnectorConfig {
  url: string;
  apiKey: string;
}

export interface ExternalConnectorValues {
  buttonLoading: boolean;
  dataLoading: boolean;
  externalConnectorApiKey: string;
  externalConnectorUrl: string;
  sourceConfigData: SourceConfigData | Pick<SourceConfigData, 'name' | 'categories'>;
}

export const ExternalConnectorLogic = kea<
  MakeLogicType<ExternalConnectorValues, ExternalConnectorActions>
>({
  path: ['enterprise_search', 'workplace_search', 'external_connector_logic'],
  actions: {
    fetchExternalSource: true,
    fetchExternalSourceSuccess: (sourceConfigData) => sourceConfigData,
    saveExternalConnectorConfigSuccess: (externalConnectorId) => externalConnectorId,
    saveExternalConnectorConfig: (config) => config,
    setExternalConnectorApiKey: (externalConnectorApiKey: string) => externalConnectorApiKey,
    setExternalConnectorUrl: (externalConnectorUrl: string) => externalConnectorUrl,
  },
  reducers: {
    dataLoading: [
      true,
      {
        fetchExternalSourceSuccess: () => false,
      },
    ],
    buttonLoading: [
      false,
      {
        saveExternalConnectorConfigSuccess: () => false,
        saveExternalConnectorConfig: () => true,
      },
    ],
    externalConnectorUrl: [
      '',
      {
        fetchExternalSourceSuccess: (_, { configuredFields: { url } }) => url || '',
        setExternalConnectorUrl: (_, url) => url,
      },
    ],
    externalConnectorApiKey: [
      '',
      {
        fetchExternalSourceSuccess: (_, { configuredFields: { apiKey } }) => apiKey || '',
        setExternalConnectorApiKey: (_, apiKey) => apiKey,
      },
    ],
    sourceConfigData: [
      { name: '', categories: [] },
      {
        fetchExternalSourceSuccess: (_, sourceConfigData) => sourceConfigData,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchExternalSource: async () => {
      const route = '/internal/workplace_search/org/settings/connectors/external';

      try {
        const response = await HttpLogic.values.http.get<SourceConfigData>(route);
        actions.fetchExternalSourceSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveExternalConnectorConfig: async () => {
      clearFlashMessages();
      // const route = '/internal/workplace_search/org/settings/connectors';
      // const http = HttpLogic.values.http.post;
      // const params = {
      //   url,
      //   api_key: apiKey,
      //   service_type: 'external',
      // };
      try {
        // const response = await http<SourceConfigData>(route, {
        //   body: JSON.stringify(params),
        // });

        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.externalConnectorCreated',
            {
              defaultMessage: 'Successfully updated configuration.',
            }
          )
        );
        // TODO: use response data instead
        actions.saveExternalConnectorConfigSuccess('external');
        KibanaLogic.values.navigateToUrl(
          getSourcesPath(`${getAddPath('external')}`, AppLogic.values.isOrganization)
        );
      } catch (e) {
        // flashAPIErrors(e);
      }
    },
  }),
});
