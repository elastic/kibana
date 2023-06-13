/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { debounce } from 'lodash';
import * as i18n from './translations';
import { ChannelsResponse, GetChannelsResponse } from '../../../common/slack_api/types';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../../common';

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
        defaultMessage="It will only fetch channels with a valid Slack Web API token. If it is empty, we will allow all channels."
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

const SlackActionFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const {
    docLinks,
    http,
    notifications: { toasts },
  } = useKibana().services;

  const form = useFormContext();
  const { setFieldValue } = form;
  const [formData] = useFormData({ form });
  const [authToken, setAuthToken] = useState('');
  const [channels, setChannels] = useState<EuiComboBoxOptionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  async function fetchChannels(newAuthToken: string) {
    setIsLoading(true);
    setChannels([]);
    setFieldValue('config.allowedChannels', []);
    isMounted.current = true;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      const res = await http.post<GetChannelsResponse>(
        `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_slack_api/channels`,
        {
          body: JSON.stringify({
            authToken: newAuthToken,
          }),
          signal: abortCtrlRef.current.signal,
        }
      );

      setIsLoading(false);
      if (isMounted.current && res.ok) {
        setChannels(
          (res?.channels ?? []).map((channel: ChannelsResponse) => ({
            label: channel.name,
          }))
        );
        toasts.addSuccess(i18n.SUCCESS_FETCH_CHANNELS);
      }

      return res;
    } catch (error) {
      if (isMounted.current) {
        setIsLoading(false);
        setChannels([]);
        if (error.name !== 'AbortError') {
          toasts.addDanger(error.body?.message ?? i18n.ERROR_FETCH_CHANNELS);
        }
      }
    }
  }

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
    if (isMounted.current && authToken && authToken.length > 0) {
      fetchChannels(authToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortCtrlRef.current.abort();
    };
  }, []);

  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={[]}
      secretsFormSchema={getSecretsFormSchema(docLinks)}
      configFormSchemaAfterSecrets={configFormSchemaAfterSecrets}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
