/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { OpenAiProviderType } from '../../../common/gen_ai/constants';
import * as i18n from './translations';
import { DEFAULT_URL, DEFAULT_URL_AZURE } from './constants';
const { emptyField } = fieldValidators;

const openAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAI API endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.openAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink
              data-test-subj="open-ai-api-doc"
              href="https://platform.openai.com/docs/api-reference"
              target="_blank"
            >
              {`${i18n.OPEN_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const azureAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL_AZURE,
    helpText: (
      <FormattedMessage
        defaultMessage="The Azure OpenAI API endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.azureAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink
              data-test-subj="azure-ai-api-doc"
              href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference"
              target="_blank"
            >
              {`${i18n.AZURE_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const openAiSecrets: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAI API authentication key for HTTP Basic authentication. For more details about generating OpenAI API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.openAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink
              data-test-subj="open-ai-api-keys-doc"
              href="https://platform.openai.com/account/api-keys"
              target="_blank"
            >
              {`${i18n.OPEN_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const azureAiSecrets: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The Azure API key for HTTP Basic authentication. For more details about generating Azure OpenAI API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.azureAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink
              data-test-subj="azure-ai-api-keys-doc"
              href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#authentication"
              target="_blank"
            >
              {`${i18n.AZURE_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const providerOptions = [
  {
    value: OpenAiProviderType.OpenAi,
    text: i18n.OPEN_AI,
    label: i18n.OPEN_AI,
  },
  {
    value: OpenAiProviderType.AzureAi,
    text: i18n.AZURE_AI,
    label: i18n.AZURE_AI,
  },
];

export const getDashboardTitle = (spaceId: string): string =>
  `Generative AI Token Usage - ${spaceId}`;

const GenerativeAiConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, id, name }] = useFormData({
    watch: ['config.apiProvider'],
  });
  const { services } = useKibana();
  const { application, dashboard, spaces } = services;
  const { navigateToUrl } = application;

  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const [dashboardId, setDashboardId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const getDashboardId = async (theSpaceId: string) => {
      const findDashboardsService = await dashboard.findDashboardsService();
      const foundDashboardId = (
        await findDashboardsService.findByTitle(getDashboardTitle(theSpaceId))
      )?.id;
      if (!ignore && foundDashboardId != null) {
        setDashboardId(foundDashboardId);
      }
    };
    if (dashboardId == null && spaceId != null && spaceId.length) {
      getDashboardId(spaceId);
    }
    return () => {
      ignore = true;
    };
  }, [dashboard, dashboardId, spaceId]);

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (dashboardId != null) {
        const url = dashboard?.locator?.getRedirectUrl({
          query: {
            language: 'kuery',
            query: `kibana.saved_objects: { id  : ${id} }`,
          },
          dashboardId,
        });
        if (url) {
          navigateToUrl(url);
        }
      }
    },
    [dashboardId, dashboard?.locator, id, navigateToUrl]
  );

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<OpenAiProviderType>('config.apiProvider') ?? OpenAiProviderType.OpenAi,
    [getFieldDefaultValue]
  );

  return (
    <>
      <UseField
        path="config.apiProvider"
        component={SelectField}
        config={{
          label: i18n.API_PROVIDER_LABEL,
          defaultValue: selectedProviderDefaultValue,
          validations: [
            {
              validator: emptyField(i18n.API_PROVIDER_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'config.apiProvider-select',
            options: providerOptions,
            fullWidth: true,
            hasNoInitialSelection: true,
            disabled: readOnly,
            readOnly,
          },
        }}
      />
      <EuiSpacer size="s" />
      {config != null && config.apiProvider === OpenAiProviderType.OpenAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={openAiConfig}
          secretsFormSchema={openAiSecrets}
        />
      )}
      {/* ^v These are intentionally not if/else because of the way the `config.defaultValue` renders */}
      {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )}
      {isEdit && dashboardId != null && (
        <EuiLink data-test-subj="link-gen-ai-token-dashboard" onClick={onClick}>
          {i18n.USAGE_DASHBOARD_LINK(selectedProviderDefaultValue, name)}
        </EuiLink>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GenerativeAiConnectorFields as default };
