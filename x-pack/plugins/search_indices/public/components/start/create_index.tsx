/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UserStartPrivilegesResponse } from '../../../common';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { isValidIndexName } from '../../utils/indices';

import { useCreateIndex } from './hooks/use_create_index';

import { CreateIndexFormState } from './types';
import { useKibana } from '../../hooks/use_kibana';

const CREATE_INDEX_CONTENT = i18n.translate(
  'xpack.searchIndices.startPage.createIndex.action.text',
  {
    defaultMessage: 'Create my index',
  }
);

export interface CreateIndexFormProps {
  formState: CreateIndexFormState;
  setFormState: React.Dispatch<React.SetStateAction<CreateIndexFormState>>;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const CreateIndexForm = ({
  userPrivileges,
  formState,
  setFormState,
}: CreateIndexFormProps) => {
  const { application } = useKibana().services;
  const [indexNameHasError, setIndexNameHasError] = useState<boolean>(false);
  const usageTracker = useUsageTracker();
  const { createIndex, isLoading } = useCreateIndex();
  const onCreateIndex = useCallback(() => {
    if (!isValidIndexName(formState.indexName)) {
      return;
    }
    usageTracker.click(AnalyticsEvents.startCreateIndexClick);
    createIndex({ indexName: formState.indexName });
  }, [usageTracker, createIndex, formState.indexName]);
  const onIndexNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndexName = e.target.value;
    setFormState({ ...formState, indexName: e.target.value });
    const invalidIndexName = !isValidIndexName(newIndexName);
    if (indexNameHasError !== invalidIndexName) {
      setIndexNameHasError(invalidIndexName);
    }
  };
  const onFileUpload = useCallback(() => {
    usageTracker.click(AnalyticsEvents.startFileUploadClick);
    application.navigateToApp('ml', { path: 'filedatavisualizer' });
  }, [usageTracker, application]);

  return (
    <>
      <EuiForm data-test-subj="createIndexUIView" fullWidth component="form">
        <EuiFormRow
          label={i18n.translate('xpack.searchIndices.startPage.createIndex.name.label', {
            defaultMessage: 'Name your index',
          })}
          helpText={i18n.translate('xpack.searchIndices.startPage.createIndex.name.helpText', {
            defaultMessage:
              'Index names must be lowercase and can only contain hyphens and numbers',
          })}
          fullWidth
          isInvalid={indexNameHasError}
        >
          <EuiFieldText
            autoFocus
            fullWidth
            data-test-subj="indexNameField"
            name="indexName"
            value={formState.indexName}
            isInvalid={indexNameHasError}
            disabled={userPrivileges?.privileges?.canCreateIndex === false}
            onChange={onIndexNameChange}
            placeholder={i18n.translate(
              'xpack.searchIndices.startPage.createIndex.name.placeholder',
              {
                defaultMessage: 'Enter a name for your index',
              }
            )}
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            {userPrivileges?.privileges?.canCreateIndex === false ? (
              <EuiToolTip
                content={
                  <p>
                    {i18n.translate('xpack.searchIndices.startPage.createIndex.permissionTooltip', {
                      defaultMessage: 'You do not have permission to create an index.',
                    })}
                  </p>
                }
              >
                <EuiButton
                  fill
                  color="primary"
                  iconSide="left"
                  iconType="sparkles"
                  data-test-subj="createIndexBtn"
                  disabled={true}
                >
                  {CREATE_INDEX_CONTENT}
                </EuiButton>
              </EuiToolTip>
            ) : (
              <EuiButton
                fill
                color="primary"
                iconSide="left"
                iconType="sparkles"
                data-telemetry-id="searchIndices-start-createIndexBtn"
                data-test-subj="createIndexBtn"
                disabled={indexNameHasError || isLoading}
                isLoading={isLoading}
                onClick={onCreateIndex}
                type="submit"
              >
                {CREATE_INDEX_CONTENT}
              </EuiButton>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            {userPrivileges?.privileges?.canCreateApiKeys && (
              <EuiFlexGroup gutterSize="s">
                <EuiIcon size="m" type="key" color="subdued" />
                <EuiText size="s" data-test-subj="apiKeyLabel">
                  <p>
                    {i18n.translate(
                      'xpack.searchIndices.startPage.createIndex.apiKeyCreation.description',
                      {
                        defaultMessage: "We'll create an API key for this index",
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiHorizontalRule margin="none" />
      <EuiPanel color="transparent" paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="documents" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.searchIndices.startPage.createIndex.fileUpload.text"
                  defaultMessage="Already have some data? {link}"
                  values={{
                    link: (
                      <EuiLink
                        data-telemetry-id="searchIndices-start-uploadFile"
                        data-test-subj="uploadFileLink"
                        onClick={onFileUpload}
                      >
                        {i18n.translate(
                          'xpack.searchIndices.startPage.createIndex.fileUpload.link',
                          {
                            defaultMessage: 'Upload a file',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
