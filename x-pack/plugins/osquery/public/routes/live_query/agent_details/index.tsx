/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useActionDetails } from '../../../actions/use_action_details';
import { ResultsTable } from '../../../results/results_table';

const LiveQueryAgentDetailsPageComponent = () => {
  const { actionId, agentId } = useParams<{ actionId: string; agentId: string }>();
  const { data } = useActionDetails({ actionId });
  const liveQueryListProps = useRouterNavigate(`live_query/${actionId}`);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...liveQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.liveQueryAgentDetails.viewLiveQueryResultsTitle"
              defaultMessage="View all live query results"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueryAgentDetails.pageTitle"
                defaultMessage="Live query {agentId} agent results"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{ agentId }}
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.liveQueryAgentDetails.pageSubtitle"
                defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [agentId, liveQueryListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {
          // @ts-expect-error update types
          data?.actionDetails._source?.data?.query
        }
      </EuiCodeBlock>
      <EuiSpacer />
      <ResultsTable actionId={actionId} agentId={agentId} />
    </WithHeaderLayout>
  );
};

export const LiveQueryAgentDetailsPage = React.memo(LiveQueryAgentDetailsPageComponent);
