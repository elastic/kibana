/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SnapshotDetails } from '../../../../common/types';

import { SectionError, SectionLoading, RestoreSnapshotForm } from '../../components';
import { useAppDependencies } from '../../index';
import { breadcrumbService } from '../../services/navigation';
import { loadSnapshot } from '../../services/http';

interface MatchParams {
  repositoryName: string;
  snapshotId: string;
}

export const RestoreSnapshot: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName, snapshotId },
  },
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('restoreSnapshot');
  }, []);

  // Snapshot details state with default empty snapshot
  const [snapshotDetails, setSnapshotDetails] = useState<Partial<SnapshotDetails>>({});

  // Load snapshot
  const { error: snapshotError, loading: loadingSnapshot, data: snapshotData } = loadSnapshot(
    repositoryName,
    snapshotId
  );

  // Update repository state when data is loaded
  useEffect(
    () => {
      if (snapshotData) {
        setSnapshotDetails(snapshotData);
      }
    },
    [snapshotData]
  );

  // Saving repository states
  // const [isSaving, setIsSaving] = useState<boolean>(false);
  // const [saveError, setSaveError] = useState<any>(null);

  // Save repository
  // const onSave = async (editedRepository: Repository | EmptyRepository) => {
  //   setIsSaving(true);
  //   setSaveError(null);
  //   const { error } = await editRepository(editedRepository);
  //   setIsSaving(false);
  //   if (error) {
  //     setSaveError(error);
  //   } else {
  //     history.push(`${BASE_PATH}/${section}/${name}`);
  //   }
  // };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.restoreSnapshot.loadingSnapshotDescription"
          defaultMessage="Loading snapshot details…"
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = snapshotError.status === 404;
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
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreSnapshot.loadingSnapshotErrorTitle"
            defaultMessage="Error loading snapshot details"
          />
        }
        error={errorObject}
      />
    );
  };

  // const renderSaveError = () => {
  //   return saveError ? (
  //     <SectionError
  //       title={
  //         <FormattedMessage
  //           id="xpack.snapshotRestore.editRepository.savingRepositoryErrorTitle"
  //           defaultMessage="Cannot save repository"
  //         />
  //       }
  //       error={saveError}
  //     />
  //   ) : null;
  // };

  // const clearSaveError = () => {
  //   setSaveError(null);
  // };

  const renderContent = () => {
    if (loadingSnapshot) {
      return renderLoading();
    }
    if (snapshotError) {
      return renderError();
    }

    return <RestoreSnapshotForm />;
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.restoreSnapshotTitle"
              defaultMessage="Restore '{snapshot}'"
              values={{ snapshot: snapshotId }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {renderContent()}
      </EuiPageContent>
    </EuiPageBody>
  );
};
