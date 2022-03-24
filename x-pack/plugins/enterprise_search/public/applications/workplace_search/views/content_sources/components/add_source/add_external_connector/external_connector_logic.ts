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
} from '../../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../../shared/http';
import { KibanaLogic } from '../../../../../../shared/kibana';
import { AppLogic } from '../../../../../app_logic';

import { getAddPath, getSourcesPath } from '../../../../../routes';

import { AddSourceLogic, SourceConfigData } from '../add_source_logic';

export interface ExternalConnectorActions {
  fetchExternalSource: () => true;
  fetchExternalSourceSuccess(sourceConfigData: SourceConfigData): SourceConfigData;
  saveExternalConnectorConfigSuccess(externalConnectorId: string): string;
  setExternalConnectorApiKey(externalConnectorApiKey: string): string;
  saveExternalConnectorConfig(config: ExternalConnectorConfig): ExternalConnectorConfig;
  setExternalConnectorUrl(externalConnectorUrl: string): string;
  resetSourceState: () => true;
  validateUrl: () => true;
  setUrlValidation(valid: boolean): boolean;
  setShowInsecureUrlCallout(showCallout: boolean): boolean;
}

export interface ExternalConnectorConfig {
  url: string;
  apiKey: string;
}

export interface ExternalConnectorValues {
  formDisabled: boolean;
  buttonLoading: boolean;
  dataLoading: boolean;
  externalConnectorApiKey: string;
  externalConnectorUrl: string;
  urlValid: boolean;
  sourceConfigData: SourceConfigData | Pick<SourceConfigData, 'name' | 'categories'>;
  insecureUrl: boolean;
  showInsecureUrlCallout: boolean;
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
    setUrlValidation: (valid: boolean) => valid,
    setShowInsecureUrlCallout: (showCallout: boolean) => showCallout,
    validateUrl: true,
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
        fetchExternalSourceSuccess: (_, { configuredFields: { externalConnectorUrl } }) =>
          externalConnectorUrl || '',
        setExternalConnectorUrl: (_, url) => url,
      },
    ],
    externalConnectorApiKey: [
      '',
      {
        fetchExternalSourceSuccess: (_, { configuredFields: { externalConnectorApiKey } }) =>
          externalConnectorApiKey || '',
        setExternalConnectorApiKey: (_, apiKey) => apiKey,
      },
    ],
    showInsecureUrlCallout: [
      false,
      {
        fetchExternalSource: () => false,
        setShowInsecureUrlCallout: (_, showCallout) => showCallout,
      },
    ],
    sourceConfigData: [
      { name: '', categories: [] },
      {
        fetchExternalSourceSuccess: (_, sourceConfigData) => sourceConfigData,
      },
    ],
    urlValid: [
      true,
      {
        setUrlValidation: (_, valid) => valid,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    [AddSourceLogic.actionTypes.setSourceConfigData]: (sourceConfigData) =>
      actions.fetchExternalSourceSuccess(sourceConfigData),
    fetchExternalSource: async () => {
      const route = '/internal/workplace_search/org/settings/connectors/external';

      try {
        const response = await HttpLogic.values.http.get<SourceConfigData>(route);
        actions.fetchExternalSourceSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    fetchExternalSourceSuccess: ({ configuredFields: { externalConnectorUrl } }) => {
      if (externalConnectorUrl && !externalConnectorUrl.startsWith('https://')) {
        actions.setShowInsecureUrlCallout(true);
      } else {
        actions.setShowInsecureUrlCallout(false);
      }
    },
    saveExternalConnectorConfig: async ({ url, apiKey }) => {
      if (!isValidExternalUrl(url)) {
        actions.setUrlValidation(false);
      } else {
        clearFlashMessages();
        const route = '/internal/workplace_search/org/settings/connectors';
        const http = HttpLogic.values.http.post;
        const params = {
          external_connector_url: url,
          external_connector_api_key: apiKey,
          service_type: 'external',
        };
        try {
          await http<SourceConfigData>(route, {
            body: JSON.stringify(params),
          });

          flashSuccessToast(
            i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.externalConnectorCreated',
              {
                defaultMessage: 'Successfully created external connector.',
              }
            )
          );
          // TODO: Once we have multiple external connector types, use response data instead
          actions.saveExternalConnectorConfigSuccess('external');
          KibanaLogic.values.navigateToUrl(
            getSourcesPath(`${getAddPath('external')}`, AppLogic.values.isOrganization)
          );
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
    validateUrl: () => {
      const url = values.externalConnectorUrl;
      actions.setUrlValidation(isValidExternalUrl(url));
      actions.setShowInsecureUrlCallout(!url.startsWith('https://'));
    },
  }),
  selectors: ({ selectors }) => ({
    formDisabled: [
      () => [selectors.buttonLoading, selectors.dataLoading],
      (buttonLoading: boolean, dataLoading: boolean) => buttonLoading || dataLoading,
    ],
    insecureUrl: [
      () => [selectors.externalConnectorUrl],
      (url: string) => !url.startsWith('https://'),
    ],
  }),
});

export const isValidExternalUrl = (url: string): boolean =>
  url.startsWith('https://') || url.startsWith('http://');
