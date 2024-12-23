/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import type { UserStartPrivilegesResponse } from '../../../common';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { CreateIndexFormState } from '../../types';
import { isValidIndexName } from '../../utils/indices';

import { useCreateIndex } from '../shared/hooks/use_create_index';
import { CreateIndexForm } from '../shared/create_index_form';

import { useKibana } from '../../hooks/use_kibana';

export interface CreateIndexUIViewProps {
  formState: CreateIndexFormState;
  setFormState: React.Dispatch<React.SetStateAction<CreateIndexFormState>>;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const CreateIndexUIView = ({
  userPrivileges,
  formState,
  setFormState,
}: CreateIndexUIViewProps) => {
  const { application } = useKibana().services;
  const [indexNameHasError, setIndexNameHasError] = useState<boolean>(false);
  const usageTracker = useUsageTracker();
  const { createIndex, isLoading } = useCreateIndex();
  const onCreateIndex = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!isValidIndexName(formState.indexName)) {
        return;
      }
      usageTracker.click(AnalyticsEvents.startCreateIndexClick);

      if (formState.defaultIndexName !== formState.indexName) {
        usageTracker.click(AnalyticsEvents.startCreateIndexPageModifyIndexName);
      }

      createIndex({ indexName: formState.indexName });
    },
    [usageTracker, createIndex, formState.indexName, formState.defaultIndexName]
  );
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
    <CreateIndexForm
      indexName={formState.indexName}
      indexNameHasError={indexNameHasError}
      isLoading={isLoading}
      onCreateIndex={onCreateIndex}
      onFileUpload={onFileUpload}
      onIndexNameChange={onIndexNameChange}
      showAPIKeyCreateLabel={userPrivileges?.privileges.canCreateApiKeys ?? false}
      userPrivileges={userPrivileges}
    />
  );
};
