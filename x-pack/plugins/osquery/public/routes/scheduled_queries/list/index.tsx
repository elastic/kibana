/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

// import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { ScheduledQueriesTable } from '../../../scheduled_queries/scheduled_queries_table';

const ScheduledQueriesPageComponent = () => {
  // const newQueryLinkProps = useRouterNavigate('live_query/new');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueryList.pageTitle"
                defaultMessage="Scheduled queries"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        {/* <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.liveQueryList.pageSubtitle"
                defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            </p>
          </EuiText>
        </EuiFlexItem> */}
      </EuiFlexGroup>
    ),
    []
  );

  // const RightColumn = useMemo(
  //   () => (
  //     <EuiButton fill {...newQueryLinkProps} iconType="plusInCircle">
  //       <FormattedMessage
  //         id="xpack.osquery.liveQueryList.newScheduledQueryButtonLabel"
  //         defaultMessage="New live query"
  //       />
  //     </EuiButton>
  //   ),
  //   [newQueryLinkProps]
  // );

  return (
    <WithHeaderLayout
      leftColumn={LeftColumn}
      // rightColumn={RightColumn} rightColumnGrow={false}
    >
      <ScheduledQueriesTable />
    </WithHeaderLayout>
  );
};

export const ScheduledQueriesPage = React.memo(ScheduledQueriesPageComponent);
