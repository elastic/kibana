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
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import { Direction } from '../../../../common/search_strategy';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useActionResults } from '../../../action_results/use_action_results';
import { useActionDetails } from '../../../actions/use_action_details';
import { ResultTabs } from '../../../queries/edit/tabs';
import { LiveQueryDetailsActionsMenu } from './actions_menu';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${({ theme }) => theme.eui.euiBorderThin};
`;

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const liveQueryListProps = useRouterNavigate('live_query');

  const { data } = useActionDetails({ actionId });
  const { data: actionResultsData } = useActionResults({
    actionId,
    activePage: 0,
    limit: 0,
    direction: Direction.asc,
    sortField: '@timestamp',
  });

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

  const RightColumn = useMemo(
    () => (
      <EuiFlexGroup justifyContent="flexEnd" direction="row">
        <EuiFlexItem grow={false} key="rows_count">
          <></>
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="rows_count_divider">
          <Divider />
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_count">
          {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop */}
          <EuiDescriptionList compressed textStyle="reverse" style={{ textAlign: 'right' }}>
            <EuiDescriptionListTitle className="eui-textNoWrap">
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.kpis.agentsQueriedLabelText"
                defaultMessage="Agents queried"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription className="eui-textNoWrap">
              {
                // @ts-expect-error update types
                data?.actionDetails?.fields?.agents?.length ?? '0'
              }
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_count_divider">
          <Divider />
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_failed_count">
          {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop */}
          <EuiDescriptionList compressed textStyle="reverse" style={{ textAlign: 'right' }}>
            <EuiDescriptionListTitle className="eui-textNoWrap">
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.kpis.agentsFailedCountLabelText"
                defaultMessage="Agents failed"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription className="eui-textNoWrap">
              {
                // @ts-expect-error update types
                actionResultsData?.rawResponse?.aggregations?.responses?.buckets.find(
                  // @ts-expect-error update types
                  (bucket) => bucket.key === 'error'
                )?.doc_count ?? '0'
              }
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_count_divider">
          <Divider />
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="actions_menu">
          <LiveQueryDetailsActionsMenu actionId={actionId} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [
      actionId,
      // @ts-expect-error update types
      actionResultsData?.rawResponse?.aggregations?.responses?.buckets,
      // @ts-expect-error update types
      data?.actionDetails?.fields?.agents?.length,
    ]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
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
