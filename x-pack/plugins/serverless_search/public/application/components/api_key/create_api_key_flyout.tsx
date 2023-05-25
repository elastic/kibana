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
import {
  BACK_LABEL,
  CANCEL_LABEL,
  NEXT_LABEL,
  INVALID_JSON_ERROR,
} from '../../../../common/i18n_string';
import { CreateAPIKeyArgs } from '../../../../common/types';
import { useKibanaServices } from '../../hooks/use_kibana';
import { CREATE_API_KEY_PATH } from '../../routes';
import { isApiError } from '../../../utils/api';
import { BasicSetupForm, DEFAULT_EXPIRES_VALUE } from './basic_setup_form';
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

const parseCreateError = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (isApiError(error)) {
    return error.body.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
};

export const CreateApiKeyFlyout: React.FC<CreateApiKeyFlyoutProps> = ({
  onClose,
  username,
  setApiKey,
}) => {
  const { http } = useKibanaServices();
  const [currentStep, setCurrentStep] = useState<Steps>(Steps.BASIC_SETUP);
  const [name, setName] = useState('');
  const [expires, setExpires] = useState<string | null>(DEFAULT_EXPIRES_VALUE);
  const [roleDescriptors, setRoleDescriptors] = useState('');
  const [roleDescriptorsError, setRoleDescriptorsError] = useState<string | undefined>(undefined);
  const [metadata, setMetadata] = useState('');
  const [metadataError, setMetadataError] = useState<string | undefined>(undefined);

  const onCreateClick = () => {
    let parsedRoleDescriptors: Record<string, any> | undefined;
    try {
      parsedRoleDescriptors = roleDescriptors.length > 0 ? JSON.parse(roleDescriptors) : undefined;
    } catch (e) {
      setCurrentStep(Steps.PRIVILEGES);
      setRoleDescriptorsError(INVALID_JSON_ERROR);
      return;
    }
    if (roleDescriptorsError) setRoleDescriptorsError(undefined);
    let parsedMetadata: Record<string, any> | undefined;
    try {
      parsedMetadata = metadata.length > 0 ? JSON.parse(metadata) : undefined;
    } catch (e) {
      setCurrentStep(Steps.METADATA);
      setMetadataError(INVALID_JSON_ERROR);
      return;
    }
    if (metadataError) setMetadataError(undefined);
    const expiration = expires !== null ? `${expires}d` : undefined;

    mutate({
      expiration,
      metadata: parsedMetadata,
      name,
      role_descriptors: parsedRoleDescriptors,
    });
  };

  const { isLoading, isError, error, mutate } = useMutation({
    mutationFn: async (input: CreateAPIKeyArgs) => {
      const result = await http.post<ApiKey>(CREATE_API_KEY_PATH, {
        body: JSON.stringify(input),
      });
      return result;
    },
    onSuccess: (apiKey) => {
      setApiKey(apiKey);
      onClose();
    },
  });
  const createError = parseCreateError(error);
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
        {isError && createError && (
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.serverlessSearch.apiKey.flyout.errorTitle', {
              defaultMessage: 'Error creating API key',
            })}
          >
            {createError}
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
            onChangeExpires={(newExpires: string | null) => setExpires(newExpires)}
          />
        )}
        {currentStep === Steps.PRIVILEGES && (
          <SecurityPrivilegesForm
            roleDescriptors={roleDescriptors}
            onChangeRoleDescriptors={setRoleDescriptors}
            error={roleDescriptorsError}
          />
        )}
        {currentStep === Steps.METADATA && (
          <MetadataForm metadata={metadata} onChangeMetadata={setMetadata} error={metadataError} />
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
                  <EuiButton fill isLoading={isLoading} onClick={onCreateClick}>
                    {i18n.translate('xpack.serverlessSearch.apiKey.flyOutCreateLabel', {
                      defaultMessage: 'Create API Key',
                    })}
                  </EuiButton>
                ) : (
                  <EuiButton
                    fill
                    disabled={!name}
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
