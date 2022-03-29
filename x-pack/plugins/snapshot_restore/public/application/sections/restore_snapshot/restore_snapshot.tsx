/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPageContentBody, EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { SnapshotDetails, RestoreSettings } from '../../../../common/types';
import { SectionError, Error, PageError } from '../../../shared_imports';
import { BASE_PATH } from '../../constants';
import { PageLoading, RestoreSnapshotForm } from '../../components';
import { useServices } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { useLoadSnapshot, executeRestore } from '../../services/http';
import { useDecodedParams } from '../../lib';

interface MatchParams {
  repositoryName: string;
  snapshotId: string;
}

export const RestoreSnapshot: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
}) => {
  const { i18n } = useServices();
  const { repositoryName, snapshotId } = useDecodedParams<MatchParams>();

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('restoreSnapshot');
    docTitleService.setTitle('restoreSnapshot');
  }, []);

  // Snapshot details state with default empty snapshot
  const [snapshotDetails, setSnapshotDetails] = useState<SnapshotDetails | {}>({});

  // Load snapshot
  const {
    error: snapshotError,
    isLoading: loadingSnapshot,
    data: snapshotData,
  } = useLoadSnapshot(repositoryName, snapshotId);

  console.log({
    repositoryName,
    snapshotId,
  });

  // Update repository state when data is loaded
  useEffect(() => {
    if (snapshotData) {
      setSnapshotDetails(snapshotData);
    }
  }, [snapshotData]);

  // Saving repository states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // Execute restore
  const onSave = async (restoreSettings: RestoreSettings) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await executeRestore(repositoryName, snapshotId, restoreSettings);
    if (error) {
      setIsSaving(false);
      setSaveError(error);
    } else {
      // Wait a few seconds before redirecting so that restore information has time to
      // populate into master node
      setTimeout(() => {
        setIsSaving(false);
        history.push(`${BASE_PATH}/restore_status`);
      }, 5 * 1000);
    }
  };

  const renderLoading = () => {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.restoreSnapshot.loadingSnapshotDescription"
          defaultMessage="Loading snapshot details…"
        />
      </PageLoading>
    );
  };

  const renderError = () => {
    const notFound = (snapshotError as any).status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.restoreSnapshot.snapshotNotFoundErrorMessage',
              {
                defaultMessage: `The snapshot '{snapshot}' does not exist in repository '{repository}'.`,
                values: {
                  snapshot: snapshotId,
                  repository: repositoryName,
                },
              }
            ),
          },
        }
      : snapshotError;

    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreSnapshot.loadingSnapshotErrorTitle"
            defaultMessage="Error loading snapshot details"
          />
        }
        error={errorObject as Error}
      />
    );
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreSnapshot.executeRestoreErrorTitle"
            defaultMessage="Unable to restore snapshot"
          />
        }
        error={saveError}
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  if (loadingSnapshot) {
    return renderLoading();
  }

  if (snapshotError) {
    return renderError();
  }

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.snapshotRestore.restoreSnapshotTitle"
              defaultMessage="Restore '{snapshot}'"
              values={{ snapshot: snapshotId }}
            />
          </span>
        }
      />

      <EuiSpacer size="l" />

      <RestoreSnapshotForm
        snapshotDetails={snapshotDetails as SnapshotDetails}
        isSaving={isSaving}
        saveError={renderSaveError()}
        clearSaveError={clearSaveError}
        onSave={onSave}
      />
    </EuiPageContentBody>
  );
};
