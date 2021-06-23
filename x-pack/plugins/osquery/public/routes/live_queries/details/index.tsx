/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  EuiButtonEmpty,
  EuiTextColor,
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
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${({ theme }) => theme.eui.euiBorderThin};
`;

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  useBreadcrumbs('live_query_details', { liveQueryId: actionId });
  const liveQueryListProps = useRouterNavigate('live_queries');

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
              id="xpack.osquery.liveQueryDetails.viewLiveQueriesHistoryTitle"
              defaultMessage="View live queries history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.pageTitle"
                defaultMessage="Live query details"
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
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
              {data?.actionDetails?.fields?.agents?.length ?? '0'}
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
              <EuiTextColor color={actionResultsData?.aggregations.failed ? 'danger' : 'default'}>
                {actionResultsData?.aggregations.failed}
              </EuiTextColor>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [actionResultsData?.aggregations.failed, data?.actionDetails?.fields?.agents?.length]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {data?.actionDetails._source?.data?.query}
      </EuiCodeBlock>
      <EuiSpacer />
      <ResultTabs
        actionId={actionId}
        agentIds={data?.actionDetails?.fields?.agents}
        startDate={get(data, ['actionDetails', 'fields', '@timestamp', '0'])}
        endDate={get(data, 'actionDetails.fields.expiration[0]')}
      />
    </WithHeaderLayout>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
