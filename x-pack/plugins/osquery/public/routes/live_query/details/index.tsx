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
import { WithHeaderLayout } from '../../../shared_imports';
import { useActionDetails } from '../../../actions/use_action_details';
import { ResultTabs } from '../../../queries/edit/tabs';

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const { data } = useActionDetails({ actionId });
  const liveQueryListProps = useRouterNavigate('live_query');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...liveQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.liveQueryDetails.viewLiveQueriesListTitle"
              defaultMessage="View all live queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.pageTitle"
                defaultMessage="Live query results"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.pageSubtitle"
                defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [liveQueryListProps]
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
      <ResultTabs actionId={actionId} />
    </WithHeaderLayout>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
