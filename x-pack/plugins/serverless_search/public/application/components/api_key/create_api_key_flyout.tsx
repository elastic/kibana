/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApiKey } from '@kbn/security-plugin/common';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { BACK_LABEL, CANCEL_LABEL, NEXT_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';
import { BasicSetupForm } from './basic_setup_form';
import { MetadataForm } from './metadata_form';
import { SecurityPrivilegesForm } from './security_privileges_form';

interface CreateApiKeyFlyoutProps {
  onClose: () => void;
  setApiKey: (apiKey: ApiKey) => void;
  username: string;
}

enum Steps {
  BASIC_SETUP,
  PRIVILEGES,
  METADATA,
}

function getNextStep(currentStep: Steps): Steps {
  switch (currentStep) {
    case Steps.BASIC_SETUP:
      return Steps.PRIVILEGES;
    case Steps.PRIVILEGES:
      return Steps.METADATA;
    case Steps.METADATA:
      return Steps.METADATA;
  }
}

function getPreviousStep(currentStep: Steps): Steps {
  switch (currentStep) {
    case Steps.BASIC_SETUP:
      return Steps.BASIC_SETUP;
    case Steps.PRIVILEGES:
      return Steps.BASIC_SETUP;
    case Steps.METADATA:
      return Steps.PRIVILEGES;
  }
}

const DEFAULT_ROLE_DESCRIPTORS = `{
  "serverless_search": {
    "indices": [{
      "names": ["*"],
      "privileges": [
        "all"
      ]
    }]
  }
}`;
const DEFAULT_METADATA = `{
  "application": "myapp"
}`;

export const CreateApiKeyFlyout: React.FC<CreateApiKeyFlyoutProps> = ({
  onClose,
  username,
  setApiKey,
}) => {
  const { http } = useKibanaServices();
  const [currentStep, setCurrentStep] = useState<Steps>(Steps.BASIC_SETUP);
  const [name, setName] = useState('');
  const [expires, setExpires] = useState('60d');
  const [roleDescriptors, setRoleDescriptors] = useState(DEFAULT_ROLE_DESCRIPTORS);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);

  const { isLoading, isError, error, data, mutate } = useMutation({
    mutationFn: async (input: {
      expiration: string;
      name: string;
      role_descriptors: string;
      metadata: string;
    }) => {
      const result = await http.post<{ apiKey: ApiKey }>('/internal/serverless_search/api_keys', {
        body: JSON.stringify(input),
      });
      return result;
    },
    onSuccess: ({ apiKey }) => {
      setApiKey(apiKey);
      onClose();
    },
  });
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.serverlessSearch.apiKey.flyoutTitle', {
              defaultMessage: 'Create an API key',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isError && (
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.serverlessSearch.apiKey.flyoutTitle', {
              defaultMessage: 'Error creating API key',
            })}
          >
            {JSON.stringify(error)}
          </EuiCallOut>
        )}
        <EuiStepsHorizontal
          steps={[
            {
              title: i18n.translate('xpack.serverlessSearch.apiKey.basicSetupLabel', {
                defaultMessage: 'Basic Setup',
              }),
              status: currentStep === Steps.BASIC_SETUP ? 'current' : 'complete',
              onClick: () => setCurrentStep(Steps.BASIC_SETUP),
            },
            {
              title: i18n.translate('xpack.serverlessSearch.apiKey.privilegesLabel', {
                defaultMessage: 'Privileges',
              }),
              status:
                currentStep === Steps.PRIVILEGES
                  ? 'current'
                  : currentStep === Steps.METADATA
                  ? 'complete'
                  : 'incomplete',
              onClick: () => setCurrentStep(Steps.PRIVILEGES),
            },
            {
              title: i18n.translate('xpack.serverlessSearch.apiKey.metadataLabel', {
                defaultMessage: 'Metadata',
              }),
              status: currentStep === Steps.METADATA ? 'current' : 'incomplete',
              onClick: () => setCurrentStep(Steps.METADATA),
            },
          ]}
        />
        {currentStep === Steps.BASIC_SETUP && (
          <BasicSetupForm
            isLoading={isLoading}
            name={name}
            user={username}
            expires={expires}
            onChangeName={(newName: string) => setName(newName)}
            onChangeExpires={(newExpires: string) => setExpires(newExpires)}
          />
        )}
        {currentStep === Steps.PRIVILEGES && (
          <SecurityPrivilegesForm
            roleDescriptors={roleDescriptors}
            onChangeRoleDescriptors={setRoleDescriptors}
          />
        )}
        {currentStep === Steps.METADATA && (
          <MetadataForm metadata={metadata} onChangeMetadata={setMetadata} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty isDisabled={isLoading} onClick={onClose}>
              {CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              {currentStep !== Steps.BASIC_SETUP && (
                <EuiFlexItem>
                  <EuiButtonEmpty
                    iconType="sortLeft"
                    isDisabled={isLoading}
                    onClick={() => setCurrentStep(getPreviousStep(currentStep))}
                  >
                    {BACK_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                {currentStep === Steps.METADATA ? (
                  <EuiButton
                    fill
                    isLoading={isLoading}
                    onClick={() =>
                      mutate({
                        expiration: expires,
                        name,
                        role_descriptors: roleDescriptors,
                        metadata,
                      })
                    }
                  >
                    {i18n.translate('xpack.serverlessSearch.apiKey.flyOutCreateLabel', {
                      defaultMessage: 'Create API Key',
                    })}
                  </EuiButton>
                ) : (
                  <EuiButton
                    fill
                    disabled={!name || !roleDescriptors}
                    onClick={() => setCurrentStep(getNextStep(currentStep))}
                  >
                    {NEXT_LABEL}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
