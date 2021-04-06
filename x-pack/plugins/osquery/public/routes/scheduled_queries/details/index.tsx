/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useScheduledQuery } from '../../../scheduled_queries/use_scheduled_query';
import { ScheduledQueryQueriesTable } from '../../../fleet_integration/components/scheduled_queries_table';

const ScheduledQueryDetailsPageComponent = () => {
  const { scheduledQueryId } = useParams<{ scheduledQueryId: string }>();
  const scheduledQueriesListProps = useRouterNavigate('scheduled_queries');
  const editQueryLinkProps = useRouterNavigate(`scheduled_queries/${scheduledQueryId}/edit`);

  const { data } = useScheduledQuery({ scheduledQueryId });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="arrowLeft"
            {...scheduledQueriesListProps}
            flush="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.osquery.scheduledQueryDetails.viewAllScheduledQueriesListTitle"
              defaultMessage="View all scheduled queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryDetails.pageTitle"
                defaultMessage="Scheduled query details"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        {/* <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.pageSubtitle"
                defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            </p>
          </EuiText>
        </EuiFlexItem> */}
      </EuiFlexGroup>
    ),
    [scheduledQueriesListProps]
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton fill {...editQueryLinkProps} iconType="plusInCircle">
        <FormattedMessage
          id="xpack.osquery.scheduledQueryDetailsPage.editQueryButtonLabel"
          defaultMessage="Edit query"
        />
      </EuiButton>
    ),
    [editQueryLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {/* <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {data?.actionDetails._source?.data?.query}
      </EuiCodeBlock> */}
      <EuiSpacer />
      {data && <ScheduledQueryQueriesTable data={data} />}
    </WithHeaderLayout>
  );
};

export const ScheduledQueryDetailsPage = React.memo(ScheduledQueryDetailsPageComponent);
