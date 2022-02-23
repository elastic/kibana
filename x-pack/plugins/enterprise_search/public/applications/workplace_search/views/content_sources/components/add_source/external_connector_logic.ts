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

export interface AddSourceActions {
  initializeAddExternalSource: () => true;
  initializeAddExternalSourceSuccess(sourceConfigData: SourceConfigData): SourceConfigData;
  setExternalConnectorUrl(externalConnectorUrl: string): string;
  setExternalConnectorApiKey(externalConnectorApiKey: string): string;
  saveExternalConnectorConfig(config: ExternalConnectorConfig): ExternalConnectorConfig;
  saveExternalConnectorConfigSuccess(externalConnectorId: string): string;
  resetSourceState: () => true;
}

export interface ExternalConnectorConfig {
  url: string;
  apiKey: string;
}

interface AddSourceValues {
  dataLoading: boolean;
  sectionLoading: boolean;
  buttonLoading: boolean;
  externalConnectorUrl: string;
  externalConnectorApiKey: string;
  sourceConfigData: SourceConfigData | { name: string; categories: [] };
}

export const ExternalConnectorLogic = kea<MakeLogicType<AddSourceValues, AddSourceActions>>({
  path: ['enterprise_search', 'workplace_search', 'external_connector_logic'],
  actions: {
    initializeAddExternalSource: () => true,
    initializeAddExternalSourceSuccess: (sourceConfigData: SourceConfigData) => sourceConfigData,
    setExternalConnectorUrl: (externalConnectorUrl: string) => externalConnectorUrl,
    setExternalConnectorApiKey: (externalConnectorApiKey: string) => externalConnectorApiKey,
    saveExternalConnectorConfig: (config: ExternalConnectorConfig) => config,
    saveExternalConnectorConfigSuccess: () => true,
    resetSourceState: () => true,
  },
  reducers: {
    dataLoading: [
      true,
      {
        initializeAddExternalSource: () => true,
        initializeAddExternalSourceSuccess: () => true,
        resetSourceState: () => false,
      },
    ],
    buttonLoading: [
      false,
      {
        saveExternalConnectorConfig: () => true,
        saveExternalConnectorConfigSuccess: () => false,
      },
    ],
    externalConnectorUrl: [
      '',
      {
        setExternalConnectorUrl: (_, url) => url,
        initializeAddExternalSourceSuccess: (_, { configuredFields: { url } }) => url || '',
        resetSourceState: () => '',
      },
    ],
    externalConnectorApiKey: [
      '',
      {
        setExternalConnectorApiKey: (_, apiKey) => apiKey,
        setSourceConfigData: (_, { configuredFields: { apiKey } }) => apiKey || '',
        resetSourceState: () => '',
      },
    ],
    sourceConfigData: [
      { name: '', categories: [] },
      {
        initializeAddExternalSourceSuccess: (_, sourceConfigData) => sourceConfigData,
      },
    ],
  },
  listeners: ({ actions }) => ({
    initializeAddExternalSource: async () => {
      const route = '/internal/workplace_search/org/settings/connectors/external';

      try {
        const response = await HttpLogic.values.http.get<SourceConfigData>(route);
        actions.initializeAddExternalSourceSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveExternalConnectorConfig: async ({ url, apiKey }) => {
      clearFlashMessages();
      const route = '/internal/workplace_search/org/settings/connectors';
      const http = HttpLogic.values.http.post;
      const params = {
        url,
        api_key: apiKey,
        service_type: 'external',
      };
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
