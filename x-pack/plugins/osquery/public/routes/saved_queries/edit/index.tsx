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
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';
import { EditSavedQueryForm } from './form';
import { useDeleteSavedQuery, useUpdateSavedQuery, useSavedQuery } from '../../../saved_queries';

const EditSavedQueryPageComponent = () => {
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const { savedQueryId } = useParams<{ savedQueryId: string }>();
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const { isLoading, data: savedQueryDetails } = useSavedQuery({ savedQueryId });
  const updateSavedQueryMutation = useUpdateSavedQuery({ savedQueryId });
  const deleteSavedQueryMutation = useDeleteSavedQuery({ savedQueryId });

  useBreadcrumbs('saved_query_edit', { savedQueryId: savedQueryDetails?.attributes?.id ?? '' });

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
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.editSavedQuery.pageTitle"
                defaultMessage='Edit "{savedQueryId}"'
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  savedQueryId: savedQueryDetails?.attributes?.id ?? '',
                }}
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [savedQueryDetails?.attributes?.id, savedQueryListProps]
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
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {!isLoading && !isEmpty(savedQueryDetails) && (
        <EditSavedQueryForm
          defaultValue={savedQueryDetails?.attributes}
          // @ts-expect-error update types
          handleSubmit={updateSavedQueryMutation.mutateAsync}
        />
      )}
      {isDeleteModalVisible ? (
        <EuiConfirmModal
          title={`Are you sure you want to delete this query?`}
          onCancel={handleCloseDeleteConfirmationModal}
          onConfirm={handleDeleteConfirmClick}
          cancelButtonText="No, don't do it"
          confirmButtonText="Yes, do it"
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>You&rsquo;re about to delete this query.</p>
          <p>Are you sure you want to do this?</p>
        </EuiConfirmModal>
      ) : null}
    </WithHeaderLayout>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
