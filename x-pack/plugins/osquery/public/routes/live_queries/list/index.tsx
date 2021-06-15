/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { ActionsTable } from '../../../actions/actions_table';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const LiveQueriesPageComponent = () => {
  useBreadcrumbs('live_queries');
  const newQueryLinkProps = useRouterNavigate('live_queries/new');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueriesHistory.pageTitle"
                defaultMessage="Live queries history"
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton fill {...newQueryLinkProps} iconType="plusInCircle">
        <FormattedMessage
          id="xpack.osquery.liveQueriesHistory.newLiveQueryButtonLabel"
          defaultMessage="New live query"
        />
      </EuiButton>
    ),
    [newQueryLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      <ActionsTable />
    </WithHeaderLayout>
  );
};

export const LiveQueriesPage = React.memo(LiveQueriesPageComponent);
