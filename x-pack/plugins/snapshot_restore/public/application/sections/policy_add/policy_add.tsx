/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageContentBody, EuiSpacer, EuiPageHeader } from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';
import { TIME_UNITS } from '../../../../common';

import { SectionError, PageError } from '../../../shared_imports';

import { PolicyForm, PageLoading } from '../../components';
import { BASE_PATH, DEFAULT_POLICY_SCHEDULE } from '../../constants';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { addPolicy, useLoadIndices } from '../../services/http';

export const PolicyAdd: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location: { pathname },
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const { error: errorLoadingIndices, isLoading: isLoadingIndices, data } = useLoadIndices();
  const { indices, dataStreams } = data ?? { indices: [], dataStreams: [] };

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policyAdd');
    docTitleService.setTitle('policyAdd');
  }, []);

  const onSave = async (newPolicy: SlmPolicyPayload) => {
    setIsSaving(true);
    setSaveError(null);
    const { name } = newPolicy;
    const { error } = await addPolicy(newPolicy);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      history.push(encodeURI(`${BASE_PATH}/policies/${encodeURIComponent(name)}`));
    }
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/policies`);
  };

  const emptyPolicy: SlmPolicyPayload = {
    name: '',
    snapshotName: '',
    schedule: DEFAULT_POLICY_SCHEDULE,
    repository: '',
    config: {},
    retention: {
      expireAfterValue: '',
      expireAfterUnit: TIME_UNITS.DAY,
      maxCount: '',
      minCount: '',
    },
    isManagedPolicy: false,
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addPolicy.savingPolicyErrorTitle"
            defaultMessage="Cannot create new policy"
          />
        }
        error={saveError}
        data-test-subj="savePolicyApiError"
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  if (isLoadingIndices) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.addPolicy.loadingIndicesDescription"
          defaultMessage="Loading available indices…"
        />
      </PageLoading>
    );
  }

  if (errorLoadingIndices) {
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addPolicy.LoadingIndicesErrorMessage"
            defaultMessage="Error loading available indices"
          />
        }
        error={errorLoadingIndices}
      />
    );
  }

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.snapshotRestore.addPolicyTitle"
              defaultMessage="Create policy"
            />
          </span>
        }
      />

      <EuiSpacer size="l" />

      <PolicyForm
        policy={emptyPolicy}
        indices={indices}
        dataStreams={dataStreams}
        currentUrl={pathname}
        isSaving={isSaving}
        saveError={renderSaveError()}
        clearSaveError={clearSaveError}
        onSave={onSave}
        onCancel={onCancel}
      />
    </EuiPageContentBody>
  );
};
