/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { debounce, isEmpty, isEqual } from 'lodash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as i18n from './translations';
import { useValidChannels } from './use_valid_channels';

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
  isDisabled: boolean,
  onChange: (options: EuiComboBoxOptionOption[]) => void,
  onCreateOption: (searchValue: string, options: EuiComboBoxOptionOption[]) => void
): ConfigFieldSchema[] => [
  {
    id: 'allowedChannelIds',
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
      noSuggestions: true,
      isDisabled,
      isLoading,
      options,
      onChange,
      onCreateOption,
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
  const [channelsToValidate, setChannelsToValidate] = useState<string>('');
  const {
    channels: validChannels,
    isLoading,
    resetChannelsToValidate,
  } = useValidChannels({
    authToken,
    channelId: channelsToValidate,
  });

  const onCreateOption = useCallback((searchValue: string, options: EuiComboBoxOptionOption[]) => {
    setChannelsToValidate(searchValue);
  }, []);
  const onChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      resetChannelsToValidate(options.map((opt: EuiComboBoxOptionOption) => opt.label));
    },
    [resetChannelsToValidate]
  );

  const configFormSchemaAfterSecrets = useMemo(() => {
    const validChannelsFormatted = validChannels.map((channel) => ({
      label: channel,
    }));
    return getConfigFormSchemaAfterSecrets(
      validChannelsFormatted,
      isLoading,
      authToken.length === 0,
      onChange,
      onCreateOption
    );
  }, [validChannels, isLoading, authToken.length, onChange, onCreateOption]);

  const debounceSetToken = debounce(setAuthToken, INPUT_TIMEOUT);
  useEffect(() => {
    if (formData.secrets && formData.secrets.token !== authToken) {
      debounceSetToken(formData.secrets.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.secrets]);

  useEffect(() => {
    if (isEmpty(authToken) && validChannels.length > 0) {
      setFieldValue('config.allowedChannelIds', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    setFieldValue('config.allowedChannelIds', validChannels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validChannels]);

  const isInitialyzed = useRef(false);
  useEffect(() => {
    if (
      !isInitialyzed.current &&
      formData.config &&
      formData.config.allowedChannelIds &&
      formData.config.allowedChannelIds.length > 0 &&
      !isEqual(formData.config.allowedChannelIds, validChannels)
    ) {
      isInitialyzed.current = true;
      resetChannelsToValidate(formData.config.allowedChannelIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.config]);

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
