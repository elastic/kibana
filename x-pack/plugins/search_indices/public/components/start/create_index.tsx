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
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { UserStartPrivilegesResponse } from '../../../common';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { isValidIndexName, generateRandomIndexName } from '../../utils/indices';

import { useCreateIndex } from './hooks/use_create_index';

interface CreateIndexFormState {
  indexName: string;
}

function initCreateIndexState(): CreateIndexFormState {
  return {
    indexName: generateRandomIndexName(),
  };
}

export interface CreateIndexFormProps {
  userPrivileges?: UserStartPrivilegesResponse;
}

export const CreateIndexForm = ({ userPrivileges }: CreateIndexFormProps) => {
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState());
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

  return (
    <EuiForm component="form" fullWidth>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.searchIndices.startPage.createIndex.title', {
                  defaultMessage: 'Create your first index',
                })}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <></>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.searchIndices.startPage.createIndex.description', {
              defaultMessage:
                'An index stores your data and defines the schema, or field mappings, for your searches',
            })}
          </p>
        </EuiText>
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
            fullWidth
            data-test-subj="indexNameField"
            name="indexName"
            value={formState.indexName}
            isInvalid={indexNameHasError}
            onChange={onIndexNameChange}
            placeholder={i18n.translate(
              'xpack.searchIndices.startPage.createIndex.name.placeholder',
              {
                defaultMessage: 'Enter a name for your index',
              }
            )}
          />
        </EuiFormRow>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              iconSide="left"
              iconType="sparkles"
              data-test-subj="createIndexBtn"
              fill
              disabled={
                indexNameHasError ||
                isLoading ||
                userPrivileges?.privileges?.canCreateIndex === false
              }
              isLoading={isLoading}
              onClick={onCreateIndex}
            >
              {i18n.translate('xpack.searchIndices.startPage.createIndex.action.text', {
                defaultMessage: 'Create my index',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            {userPrivileges?.privileges?.canCreateApiKeys && (
              <EuiFlexGroup gutterSize="s">
                <EuiIcon size="l" type="key" color="subdued" />
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
      </EuiFlexGroup>
    </EuiForm>
  );
};
