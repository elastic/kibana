/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { LiveQuery } from '../../../live_queries';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

const NewLiveQueryPageComponent = () => {
  useBreadcrumbs('live_query_new');
  const location = useLocation();
  const liveQueryListProps = useRouterNavigate('live_queries');

  const formDefaultValue = useMemo(() => {
    const queryParams = qs.parse(location.search);

    if (queryParams?.agentPolicyId) {
      return {
        agentSelection: {
          allAgentsSelected: false,
          agents: [],
          platformsSelected: [],
          policiesSelected: [queryParams?.agentPolicyId],
        },
      };
    }

    return undefined;
  }, [location.search]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...liveQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.newLiveQuery.viewLiveQueriesListTitle"
              defaultMessage="View all live queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.newLiveQuery.pageTitle"
                defaultMessage="New live query"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [liveQueryListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <LiveQuery defaultValue={formDefaultValue} />
    </WithHeaderLayout>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
