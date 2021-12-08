/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiFieldText,
  EuiText,
  EuiFormFieldset,
  EuiCheckbox,
  htmlIdGenerator,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { CreateApiKeyResponse } from '../../../../../common/agent_key_types';
import { useCurrentUser } from '../../../../hooks/use_current_user';

interface Props {
  onCancel: () => void;
  onSuccess: (agentKey: CreateApiKeyResponse) => void;
  onError: (keyName: string, message: string) => void;
}

export function CreateAgentKeyFlyout({ onCancel, onSuccess, onError }: Props) {
  const [formTouched, setFormTouched] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [agentConfigChecked, setAgentConfigChecked] = useState(true);
  const [eventWriteChecked, setEventWriteChecked] = useState(true);
  const [sourcemapChecked, setSourcemapChecked] = useState(true);

  const currentUser = useCurrentUser();

  const isInputInvalid = isEmpty(keyName);
  const isFormInvalid = formTouched && isInputInvalid;

  const formError = i18n.translate(
    'xpack.apm.settings.agentKeys.createKeyFlyout.name.placeholder',
    { defaultMessage: 'Enter a name' }
  );

  const createAgentKeyTitle = i18n.translate(
    'xpack.apm.settings.agentKeys.createKeyFlyout.createAgentKey',
    { defaultMessage: 'Create agent key' }
  );

  const createAgentKey = async () => {
    setFormTouched(true);
    if (isInputInvalid) {
      return;
    }

    try {
      const { agentKey } = await callApmApi({
        endpoint: 'POST /api/apm/agent_keys',
        signal: null,
        params: {
          body: {
            name: keyName,
            sourcemap: sourcemapChecked,
            event: eventWriteChecked,
            agentConfig: agentConfigChecked,
          },
        },
      });

      onSuccess(agentKey);
    } catch (error) {
      onError(keyName, error.body?.message || error.message);
    }
  };

  return (
    <EuiFlyout onClose={onCancel} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>{createAgentKeyTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm isInvalid={isFormInvalid} error={formError}>
          {currentUser && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.userTitle',
                { defaultMessage: 'User' }
              )}
            >
              <EuiText>{currentUser?.username}</EuiText>
            </EuiFormRow>
          )}
          <EuiFormRow
            label={i18n.translate(
              'xpack.apm.settings.agentKeys.createKeyFlyout.nameTitle',
              {
                defaultMessage: 'Name',
              }
            )}
            helpText={i18n.translate(
              'xpack.apm.settings.agentKeys.createKeyFlyout.nameHelpText',
              {
                defaultMessage: 'What is this key used for?',
              }
            )}
            isInvalid={isFormInvalid}
            error={formError}
          >
            <EuiFieldText
              name="name"
              placeholder={i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.namePlaceholder',
                {
                  defaultMessage: 'e.g. apm-key',
                }
              )}
              onChange={(e) => setKeyName(e.target.value)}
              isInvalid={isFormInvalid}
              onBlur={() => setFormTouched(true)}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormFieldset
            legend={{
              children: i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.privilegesFieldset',
                {
                  defaultMessage: 'Assign privileges',
                }
              ),
            }}
          >
            <EuiFormRow
              helpText={i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.agentConfigHelpText',
                {
                  defaultMessage:
                    'Required for agents to read agent configuration remotely.',
                }
              )}
            >
              <EuiCheckbox
                id={htmlIdGenerator()()}
                label="config_agent:read"
                checked={agentConfigChecked}
                onChange={() => setAgentConfigChecked((state) => !state)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              helpText={i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.ingestAgentEvents',
                {
                  defaultMessage: 'Required for ingesting events.',
                }
              )}
            >
              <EuiCheckbox
                id={htmlIdGenerator()()}
                label="event:write"
                checked={eventWriteChecked}
                onChange={() => setEventWriteChecked((state) => !state)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              helpText={i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.sourcemaps',
                {
                  defaultMessage: 'Required for uploading sourcemaps.',
                }
              )}
            >
              <EuiCheckbox
                id={htmlIdGenerator()()}
                label="sourcemap:write"
                checked={sourcemapChecked}
                onChange={() => setSourcemapChecked((state) => !state)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
          </EuiFormFieldset>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>
              {i18n.translate(
                'xpack.apm.settings.agentKeys.createKeyFlyout.cancelButton',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={true}
              onClick={createAgentKey}
              type="submit"
              disabled={isFormInvalid}
            >
              {createAgentKeyTitle}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
