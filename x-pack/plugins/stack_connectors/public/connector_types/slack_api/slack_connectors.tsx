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

import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
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
    label: i18n.ALLOWED_CHANNELS,
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

  const [{ secrets }] = useFormData();
  const [token, setToken] = useState('');
  const [channels, setChannels] = useState<EuiComboBoxOptionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  async function fetchChannels(newToken: string) {
    setIsLoading(true);
    setChannels([]);
    isMounted.current = true;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      const res = await http.get<GetChannelsResponse>(
        `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_slack_api/channels/${newToken}`
      );

      if (isMounted.current) {
        setIsLoading(false);
        setChannels(
          (res?.channels ?? []).map((channel: ChannelsResponse) => ({
            label: channel.name,
          }))
        );
        // toasts.addSuccess(
        //   i18n.translate(
        //     'xpack.triggersActionsUI.sections.addConnectorForm.updateSuccessNotificationText',
        //     {
        //       defaultMessage: "Created '{connectorName}'",
        //       values: {
        //         connectorName: res.name,
        //       },
        //     }
        //   )
        // );
      }

      return res;
    } catch (error) {
      if (isMounted.current) {
        setIsLoading(false);
        setChannels([]);
        // if (error.name !== 'AbortError') {
        //   toasts.addDanger(
        //     error.body?.message ??
        //       i18n.translate(
        //         'xpack.triggersActionsUI.sections.useCreateConnector.updateErrorNotificationText',
        //         { defaultMessage: 'Cannot create a connector.' }
        //       )
        //   );
        // }
      }
    }
  }

  const configFormSchemaAfterSecrets = useMemo(
    () => getConfigFormSchemaAfterSecrets(channels, isLoading, token.length > 0),
    [channels, isLoading, token]
  );

  const debounceSetToken = debounce(setToken, INPUT_TIMEOUT);
  useEffect(() => {
    if (secrets && secrets.token && secrets.token.length > 0) {
      debounceSetToken(secrets.token);
    }
  }, [debounceSetToken, secrets]);

  useEffect(() => {
    fetchChannels(token);
    return () => {
      isMounted.current = false;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
