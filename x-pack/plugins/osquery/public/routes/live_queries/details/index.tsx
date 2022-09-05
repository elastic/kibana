/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { AddToCaseButton } from '../../../cases/add_to_cases_button';
import { useGetUserCasesPermissions } from '../../../cases/use_get_cases_permissions';
import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const { cases } = useKibana().services;
  const casePermissions = useGetUserCasesPermissions();
  const CasesContext = cases.ui.getCasesContext();
  useBreadcrumbs('live_query_details', { liveQueryId: actionId });
  const liveQueryListProps = useRouterNavigate('live_queries');
  const [isLive, setIsLive] = useState(false);
  const { data } = useLiveQueryDetails({ actionId, isLive });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...liveQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.liveQueryDetails.viewLiveQueriesHistoryTitle"
              defaultMessage="View live queries history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.pageTitle"
                defaultMessage="Live query details"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [liveQueryListProps]
  );

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);
  const casesOwner = useMemo(() => [SECURITY_SOLUTION_OWNER], []);
  const addToCaseButton = useCallback(
    (queryId?: string) => (
      <AddToCaseButton queryId={queryId} actionId={actionId} agentIds={data?.agents} />
    ),
    [data?.agents, actionId]
  );

  return (
    <CasesContext owner={casesOwner} permissions={casePermissions}>
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        <PackQueriesStatusTable
          actionId={actionId}
          data={data?.queries}
          startDate={data?.['@timestamp']}
          expirationDate={data?.expiration}
          agentIds={data?.agents}
          addToCase={addToCaseButton}
          showResultsHeader
        />
      </WithHeaderLayout>
    </CasesContext>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
