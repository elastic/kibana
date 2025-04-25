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

import { SourceConfigData } from '../add_source_logic';

export interface ExternalConnectorActions {
  fetchExternalSource(): void;
  fetchExternalSourceSuccess(sourceConfigData: SourceConfigData): SourceConfigData;
  saveExternalConnectorConfigError(): void;
  saveExternalConnectorConfigSuccess(externalConnectorId: string): string;
  setExternalConnectorApiKey(externalConnectorApiKey: string): string;
  saveExternalConnectorConfig(): void;
  setExternalConnectorUrl(externalConnectorUrl: string): string;
  resetSourceState(): void;
  validateUrl(): void;
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
    saveExternalConnectorConfigError: () => true,
    saveExternalConnectorConfigSuccess: (externalConnectorId) => externalConnectorId,
    saveExternalConnectorConfig: () => true,
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
        saveExternalConnectorConfigError: () => false,
        saveExternalConnectorConfig: () => true,
      },
    ],
    externalConnectorUrl: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        fetchExternalSourceSuccess: (
          // @ts-expect-error upgrade typescript v5.1.6
          _,
          // @ts-expect-error upgrade typescript v5.1.6
          { configuredFields: { external_connector_url: externalConnectorUrl } }
        ) => externalConnectorUrl || '',
        // @ts-expect-error upgrade typescript v5.1.6
        setExternalConnectorUrl: (_, url) => url,
      },
    ],
    externalConnectorApiKey: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        fetchExternalSourceSuccess: (
          // @ts-expect-error upgrade typescript v5.1.6
          _,
          // @ts-expect-error upgrade typescript v5.1.6
          { configuredFields: { external_connector_api_key: externalConnectorApiKey } }
        ) => externalConnectorApiKey || '',
        // @ts-expect-error upgrade typescript v5.1.6
        setExternalConnectorApiKey: (_, apiKey) => apiKey,
      },
    ],
    showInsecureUrlCallout: [
      false,
      {
        fetchExternalSource: () => false,
        // @ts-expect-error upgrade typescript v5.1.6
        setShowInsecureUrlCallout: (_, showCallout) => showCallout,
      },
    ],
    urlValid: [
      true,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setUrlValidation: (_, valid) => valid,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
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
    saveExternalConnectorConfig: async () => {
      if (!isValidExternalUrl(values.externalConnectorUrl)) {
        actions.setUrlValidation(false);
      } else {
        clearFlashMessages();
        try {
          await HttpLogic.values.http.post<SourceConfigData>(
            '/internal/workplace_search/org/settings/connectors',
            {
              body: JSON.stringify({
                external_connector_url: values.externalConnectorUrl,
                external_connector_api_key: values.externalConnectorApiKey,
                service_type: 'external',
              }),
            }
          );

          flashSuccessToast(
            i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.externalConnectorCreated',
              {
                defaultMessage: 'Successfully registered connector package deployment.',
              }
            )
          );
          // TODO: Once we have multiple external connector types, use response data instead
          actions.saveExternalConnectorConfigSuccess('external');
          KibanaLogic.values.navigateToUrl(
            getSourcesPath(`${getAddPath('external')}`, AppLogic.values.isOrganization)
          );
        } catch (e) {
          actions.saveExternalConnectorConfigError();
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
