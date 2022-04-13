/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageContentBody, EuiPageHeader, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';
import { SectionError, Error, PageError } from '../../../shared_imports';
import { useDecodedParams } from '../../lib';
import { TIME_UNITS } from '../../../../common/constants';
import { PageLoading, PolicyForm } from '../../components';
import { BASE_PATH } from '../../constants';
import { useServices } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { editPolicy, useLoadPolicy, useLoadIndices } from '../../services/http';

interface MatchParams {
  name: string;
}

export const PolicyEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
  location: { pathname },
}) => {
  const { name } = useDecodedParams<MatchParams>();
  const { i18n } = useServices();

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policyEdit');
    docTitleService.setTitle('policyEdit');
  }, []);

  // Policy state with default empty policy
  const [policy, setPolicy] = useState<SlmPolicyPayload>({
    name: '',
    snapshotName: '',
    schedule: '',
    repository: '',
    config: {},
    retention: {
      expireAfterValue: '',
      expireAfterUnit: TIME_UNITS.DAY,
      maxCount: '',
      minCount: '',
    },
    isManagedPolicy: false,
  });

  const {
    error: errorLoadingIndices,
    isLoading: isLoadingIndices,
    data: indicesData,
  } = useLoadIndices();

  // Load policy
  const {
    error: errorLoadingPolicy,
    isLoading: isLoadingPolicy,
    data: policyData,
  } = useLoadPolicy(name);

  // Update policy state when data is loaded
  useEffect(() => {
    if (policyData?.policy) {
      const { policy: policyToEdit } = policyData;

      // The policy response includes data not pertinent to the form
      // that we need to remove, e.g., lastSuccess, lastFailure, stats
      const policyFormData: SlmPolicyPayload = {
        name: policyToEdit.name,
        snapshotName: policyToEdit.snapshotName,
        schedule: policyToEdit.schedule,
        repository: policyToEdit.repository,
        config: policyToEdit.config,
        retention: policyToEdit.retention,
        isManagedPolicy: policyToEdit.isManagedPolicy,
      };

      setPolicy(policyFormData);
    }
  }, [policyData]);

  // Saving policy states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // Save policy
  const onSave = async (editedPolicy: SlmPolicyPayload) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await editPolicy(editedPolicy);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      history.push(encodeURI(`${BASE_PATH}/policies/${encodeURIComponent(name)}`));
    }
  };

  const onCancel = () => {
    history.push(encodeURI(`${BASE_PATH}/policies/${encodeURIComponent(name)}`));
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editPolicy.savingPolicyErrorTitle"
            defaultMessage="Cannot save policy"
          />
        }
        error={saveError}
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  const renderLoading = () => {
    return isLoadingPolicy ? (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editPolicy.loadingPolicyDescription"
          defaultMessage="Loading policy details…"
        />
      </PageLoading>
    ) : (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editPolicy.loadingIndicesDescription"
          defaultMessage="Loading available indices…"
        />
      </PageLoading>
    );
  };

  const renderError = () => {
    if (errorLoadingPolicy) {
      const notFound = (errorLoadingPolicy as any).status === 404;
      const errorObject = notFound
        ? {
            data: {
              error: i18n.translate('xpack.snapshotRestore.editPolicy.policyNotFoundErrorMessage', {
                defaultMessage: `The policy '{name}' does not exist.`,
                values: {
                  name,
                },
              }),
            },
          }
        : errorLoadingPolicy;

      return (
        <PageError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.editPolicy.loadingPolicyErrorTitle"
              defaultMessage="Error loading policy details"
            />
          }
          error={errorObject as Error}
        />
      );
    }

    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editPolicy.LoadingIndicesErrorMessage"
            defaultMessage="Error loading available indices"
          />
        }
        error={errorLoadingIndices as Error}
      />
    );
  };

  if (isLoadingPolicy || isLoadingIndices) {
    return renderLoading();
  }

  if (errorLoadingPolicy || errorLoadingIndices) {
    return renderError();
  }

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.snapshotRestore.editPolicyTitle"
              defaultMessage="Edit policy"
            />
          </span>
        }
      />
      <EuiSpacer size="l" />

      {policy.isManagedPolicy ? (
        <>
          <EuiCallOut
            size="m"
            color="warning"
            iconType="iInCircle"
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.editPolicy.managedPolicyWarningTitle"
                defaultMessage="This is a managed policy. Changing this policy might affect other systems that use it. Proceed with caution."
              />
            }
          />
          <EuiSpacer size="l" />
        </>
      ) : null}

      <PolicyForm
        policy={policy}
        dataStreams={indicesData!.dataStreams}
        indices={indicesData!.indices}
        currentUrl={pathname}
        isEditing={true}
        isSaving={isSaving}
        saveError={renderSaveError()}
        clearSaveError={clearSaveError}
        onSave={onSave}
        onCancel={onCancel}
      />
    </EuiPageContentBody>
  );
};
