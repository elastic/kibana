/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';
import { NewSavedQueryForm } from './form';
import { useCreateSavedQuery } from '../../../saved_queries/use_create_saved_query';

const NewSavedQueryPageComponent = () => {
  useBreadcrumbs('saved_query_new');
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const createSavedQueryMutation = useCreateSavedQuery({ withRedirect: true });

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
      {
        // @ts-expect-error update types
        <NewSavedQueryForm handleSubmit={createSavedQueryMutation.mutateAsync} />
      }
    </WithHeaderLayout>
  );
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
