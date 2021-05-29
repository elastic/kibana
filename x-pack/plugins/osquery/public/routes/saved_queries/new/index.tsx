/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { pagePathGetters } from '../../../common/page_paths';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';
import { NewSavedQueryForm } from './form';

const NewSavedQueryPageComponent = () => {
  useBreadcrumbs('saved_query_new');
  const queryClient = useQueryClient();
  const savedQueryListProps = useRouterNavigate('saved_queries');
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;

  const createSavedQueryMutation = useMutation(
    (payload) => http.post(`/internal/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
      onSuccess: (payload) => {
        queryClient.invalidateQueries('savedQueryList');
        navigateToApp('osquery', { path: pagePathGetters.saved_queries() });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.newSavedQuery.successToastMessageText', {
            defaultMessage: 'Successfully saved "{savedQueryName}" query',
            values: {
              savedQueryName: payload.attributes?.name ?? '',
            },
          })
        );
      },
    }
  );

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...savedQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.addSavedQuery.viewSavedQueriesListTitle"
              defaultMessage="View all saved queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.addSavedQuery.pageTitle"
                defaultMessage="Add saved query"
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [savedQueryListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <NewSavedQueryForm handleSubmit={createSavedQueryMutation.mutate} />
    </WithHeaderLayout>
  );
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
