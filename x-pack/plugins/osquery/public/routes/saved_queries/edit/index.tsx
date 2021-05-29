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
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';
import { pagePathGetters } from '../../../common/page_paths';
import { EditSavedQueryForm } from './form';

const EditSavedQueryPageComponent = () => {
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const queryClient = useQueryClient();
  const { savedQueryId } = useParams<{ savedQueryId: string }>();
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { isLoading, data: savedQueryDetails } = useQuery(
    ['savedQuery', { savedQueryId }],
    () => http.get(`/internal/osquery/saved_query/${savedQueryId}`),
    {
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
    }
  );

  useBreadcrumbs('saved_query_edit', { savedQueryName: savedQueryDetails?.attributes?.name ?? '' });

  const updateSavedQueryMutation = useMutation(
    (payload) =>
      http.put(`/internal/osquery/saved_query/${savedQueryId}`, { body: JSON.stringify(payload) }),
    {
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
      onSuccess: (payload) => {
        queryClient.invalidateQueries('savedQueryList');
        navigateToApp('osquery', { path: pagePathGetters.saved_queries() });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.editSavedQuery.deleteSuccessToastMessageText', {
            defaultMessage: 'Successfully updated "{savedQueryName}" query',
            values: {
              savedQueryName: payload.attributes?.name ?? '',
            },
          })
        );
      },
    }
  );

  const deleteSavedQueriesMutation = useMutation(
    () =>
      http.delete(`/internal/osquery/saved_query`, {
        body: JSON.stringify({ savedQueryIds: [savedQueryId] }),
      }),
    {
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
      onSuccess: () => {
        handleCloseDeleteConfirmationModal();
        queryClient.invalidateQueries('savedQueryList');
        navigateToApp('osquery', { path: pagePathGetters.saved_queries() });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.editSavedQuery.deleteSuccessToastMessageText', {
            defaultMessage: 'Successfully deleted "{savedQueryName}" query',
            values: {
              savedQueryName: savedQueryDetails?.attributes?.name ?? '',
            },
          })
        );
      },
    }
  );

  const handleCloseDeleteConfirmationModal = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirmClick = useCallback(() => {
    deleteSavedQueriesMutation.mutate();
  }, [deleteSavedQueriesMutation]);

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
                defaultMessage={`Edit "{queryName}"`}
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  queryName: savedQueryDetails?.attributes?.name ?? '',
                }}
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [savedQueryDetails?.attributes?.name, savedQueryListProps]
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
          handleSubmit={updateSavedQueryMutation.mutate}
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
