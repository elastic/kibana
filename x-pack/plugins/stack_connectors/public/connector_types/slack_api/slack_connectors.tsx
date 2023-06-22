/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiComboBoxOptionOption, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from '@kbn/core/public';

import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { debounce, isEmpty } from 'lodash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as i18n from './translations';
import { useFetchChannels } from './use_fetch_channels';

/** wait this many ms after the user completes typing before applying the filter input */
const INPUT_TIMEOUT = 250;

const getSecretsFormSchema = (docLinks: DocLinksStart): SecretsFieldSchema[] => [
  {
    id: 'token',
    label: i18n.TOKEN_LABEL,
    isPasswordField: true,
    helpText: (
      <EuiLink href={docLinks.links.alerting.slackApiAction} target="_blank">
        <FormattedMessage
          id="xpack.stackConnectors.components.slack_api.apiKeyDocumentation"
          defaultMessage="Create a Slack Web API token"
        />
      </EuiLink>
    ),
  },
];

const getConfigFormSchemaAfterSecrets = (
  options: EuiComboBoxOptionOption[],
  isLoading: boolean,
  isDisabled: boolean
): ConfigFieldSchema[] => [
  {
    id: 'allowedChannels',
    isRequired: false,
    label: i18n.ALLOWED_CHANNELS,
    helpText: (
      <FormattedMessage
        id="xpack.stackConnectors.components.slack_api.allowedChannelsText"
        defaultMessage="By default, the connector can access all channels within the scope of the Slack app."
      />
    ),
    type: 'COMBO_BOX',
    euiFieldProps: {
      isDisabled,
      isLoading,
      noSuggestions: false,
      options,
    },
  },
];

const NO_SCHEMA: ConfigFieldSchema[] = [];

export const SlackActionFieldsComponents: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { docLinks } = useKibana().services;

  const form = useFormContext();
  const { setFieldValue } = form;
  const [formData] = useFormData({ form });
  const [authToken, setAuthToken] = useState('');

  const { channels, isLoading } = useFetchChannels({ authToken });
  const configFormSchemaAfterSecrets = useMemo(
    () => getConfigFormSchemaAfterSecrets(channels, isLoading, channels.length === 0),
    [channels, isLoading]
  );

  const debounceSetToken = debounce(setAuthToken, INPUT_TIMEOUT);
  useEffect(() => {
    if (formData.secrets && formData.secrets.token !== authToken) {
      debounceSetToken(formData.secrets.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.secrets]);

  useEffect(() => {
    if (isEmpty(authToken) && channels.length > 0) {
      setFieldValue('config.allowedChannels', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={NO_SCHEMA}
      secretsFormSchema={getSecretsFormSchema(docLinks)}
      configFormSchemaAfterSecrets={configFormSchemaAfterSecrets}
    />
  );
};

export const simpleConnectorQueryClient = new QueryClient();

const SlackActionFields: React.FC<ActionConnectorFieldsProps> = (props) => (
  <QueryClientProvider client={simpleConnectorQueryClient}>
    <SlackActionFieldsComponents {...props} />
  </QueryClientProvider>
);

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
