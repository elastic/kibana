/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useActionDetails } from '../../../actions/use_action_details';
import { ResultTabs } from '../../saved_queries/edit/tabs';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  useBreadcrumbs('live_query_details', { liveQueryId: actionId });
  const liveQueryListProps = useRouterNavigate('live_queries');

  const { data } = useActionDetails({ actionId });

  const isPackResults = useMemo(() => !!data?.actionDetails._source.queries.length, [data]);

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

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      {isPackResults ? (
        <PackQueriesStatusTable
          actionId={actionId}
          data={data?.actionDetails._source?.queries}
          startDate={data?.actionDetails._source?.['@timestamp']}
          expirationDate={data?.actionDetails._source?.expiration}
          agentIds={data?.actionDetails?.fields?.agents}
        />
      ) : (
        <>
          <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
            {data?.actionDetails._source?.queries?.[0]?.query ??
              data?.actionDetails._source?.data?.query}
          </EuiCodeBlock>
          <EuiSpacer />

          <ResultTabs
            actionId={actionId}
            agentIds={data?.actionDetails?.fields?.agents}
            startDate={get(data, ['actionDetails', 'fields', '@timestamp', '0'])}
            endDate={get(data, 'actionDetails.fields.expiration[0]')}
          />
        </>
      )}
    </WithHeaderLayout>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
