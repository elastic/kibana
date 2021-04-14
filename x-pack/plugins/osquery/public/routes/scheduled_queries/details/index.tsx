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
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useScheduledQuery } from '../../../scheduled_queries/use_scheduled_query';
import { ScheduledQueryQueriesTable } from '../../../scheduled_queries/scheduled_query_queries_table';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${({ theme }) => theme.eui.euiBorderThin};
`;

const ScheduledQueryDetailsPageComponent = () => {
  const { scheduledQueryId } = useParams<{ scheduledQueryId: string }>();
  const scheduledQueriesListProps = useRouterNavigate('scheduled_queries');
  const editQueryLinkProps = useRouterNavigate(`scheduled_queries/${scheduledQueryId}/edit`);

  const { data } = useScheduledQuery({ scheduledQueryId });

  console.error('data', data);

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
              defaultMessage="View all scheduled query groups"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryDetails.pageTitle"
                defaultMessage="{queryName} details"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  queryName: data?.name,
                }}
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
    [data?.name, scheduledQueriesListProps]
  );

  const RightColumn = useMemo(
    () => (
      <EuiFlexGroup justifyContent="flexEnd" direction="row">
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
              {/* <EuiTextColor color={actionResultsData?.aggregations.failed ? 'danger' : 'default'}>
                {actionResultsData?.aggregations.failed}
              </EuiTextColor> */}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_failed_count_divider">
          <Divider />
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_failed_count">
          <EuiButton fill {...editQueryLinkProps} iconType="pencil">
            <FormattedMessage
              id="xpack.osquery.scheduledQueryDetailsPage.editQueryButtonLabel"
              defaultMessage="Edit"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
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
