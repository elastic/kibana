/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';

import styled from 'styled-components';
import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { EditSavedQueryForm } from './form';
import { useDeleteSavedQuery, useUpdateSavedQuery, useSavedQuery } from '../../../saved_queries';

const StyledEuiCallOut = styled(EuiCallOut)`
  margin: 10px;
`;

const EditSavedQueryPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const { savedQueryId } = useParams<{ savedQueryId: string }>();
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const { isLoading, data: savedQueryDetails } = useSavedQuery({ savedQueryId });
  const updateSavedQueryMutation = useUpdateSavedQuery({ savedQueryId });
  const deleteSavedQueryMutation = useDeleteSavedQuery({ savedQueryId });

  useBreadcrumbs('saved_query_edit', { savedQueryName: savedQueryDetails?.attributes?.id ?? '' });

  const elasticPrebuiltQuery = useMemo(
    () => savedQueryDetails?.attributes?.version,
    [savedQueryDetails]
  );
  const viewMode = useMemo(
    () => !permissions.writeSavedQueries || elasticPrebuiltQuery,
    [permissions.writeSavedQueries, elasticPrebuiltQuery]
  );

  const handleCloseDeleteConfirmationModal = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirmClick = useCallback(() => {
    deleteSavedQueryMutation.mutateAsync().then(() => {
      handleCloseDeleteConfirmationModal();
    });
  }, [deleteSavedQueryMutation, handleCloseDeleteConfirmationModal]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...savedQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.editSavedQuery.viewSavedQueriesListTitle"
              defaultMessage="View all saved queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              {viewMode ? (
                <>
                  <FormattedMessage
                    id="xpack.osquery.viewSavedQuery.pageTitle"
                    defaultMessage='"{savedQueryId}" details'
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    values={{
                      savedQueryId: savedQueryDetails?.attributes?.id ?? '',
                    }}
                  />
                  {elasticPrebuiltQuery && (
                    <StyledEuiCallOut size="s">
                      <FormattedMessage
                        id="xpack.osquery.viewSavedQuery.prebuiltInfo"
                        defaultMessage="This is a prebuilt Elastic query, and it cannot be edited."
                      />
                    </StyledEuiCallOut>
                  )}
                </>
              ) : (
                <FormattedMessage
                  id="xpack.osquery.editSavedQuery.pageTitle"
                  defaultMessage='Edit "{savedQueryId}"'
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  values={{
                    savedQueryId: savedQueryDetails?.attributes?.id ?? '',
                  }}
                />
              )}
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [elasticPrebuiltQuery, savedQueryDetails?.attributes?.id, savedQueryListProps, viewMode]
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton color="danger" onClick={handleDeleteClick} iconType="trash">
        <FormattedMessage
          id="xpack.osquery.editSavedQuery.deleteSavedQueryButtonLabel"
          defaultMessage="Delete query"
        />
      </EuiButton>
    ),
    [handleDeleteClick]
  );

  if (isLoading) return null;

  return (
    <WithHeaderLayout
      leftColumn={LeftColumn}
      rightColumn={!viewMode ? RightColumn : undefined}
      rightColumnGrow={false}
    >
      {!isLoading && !isEmpty(savedQueryDetails) && (
        <EditSavedQueryForm
          defaultValue={savedQueryDetails?.attributes}
          handleSubmit={updateSavedQueryMutation.mutateAsync}
          viewMode={viewMode}
        />
      )}
      {isDeleteModalVisible ? (
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.osquery.deleteSavedQuery.confirmationModal.title"
              defaultMessage="Are you sure you want to delete this query?"
            />
          }
          onCancel={handleCloseDeleteConfirmationModal}
          onConfirm={handleDeleteConfirmClick}
          cancelButtonText={
            <FormattedMessage
              id="xpack.osquery.deleteSavedQuery.confirmationModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.osquery.deleteSavedQuery.confirmationModal.confirmButtonLabel"
              defaultMessage="Confirm"
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <FormattedMessage
            id="xpack.osquery.deleteSavedQuery.confirmationModal.body"
            defaultMessage="You're about to delete this query. Are you sure you want to do this?"
          />
        </EuiConfirmModal>
      ) : null}
    </WithHeaderLayout>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
