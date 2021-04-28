/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useScheduledQueryGroup } from '../../../scheduled_query_groups/use_scheduled_query_group';
import { ScheduledQueryGroupQueriesTable } from '../../../scheduled_query_groups/scheduled_query_group_queries_table';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { AgentsPolicyLink } from '../../../agent_policies/agents_policy_link';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';
import { DeleteScheduledQueryGroupButton } from '../../../scheduled_query_groups/delete_scheduled_query_group_button';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${({ theme }) => theme.eui.euiBorderThin};
`;

const ScheduledQueryGroupDetailsPageComponent = () => {
  const { scheduledQueryGroupId } = useParams<{ scheduledQueryGroupId: string }>();
  const scheduledQueryGroupsListProps = useRouterNavigate('scheduled_query_groups');
  const editQueryLinkProps = useRouterNavigate(
    `scheduled_query_groups/${scheduledQueryGroupId}/edit`
  );
  const [isPopoverOpen, setPopover] = useState(false);

  const showActionsPopover = useCallback(() => setPopover(true), []);
  const closeActionsPopover = useCallback(() => setPopover(false), []);

  const { data } = useScheduledQueryGroup({ scheduledQueryGroupId });

  useBreadcrumbs('scheduled_query_group_details', { scheduledQueryGroupName: data?.name ?? '' });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="arrowLeft"
            {...scheduledQueryGroupsListProps}
            flush="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.osquery.scheduledQueryGroupDetails.viewAllScheduledQueriesListTitle"
              defaultMessage="View all scheduled query groups"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroupDetails.pageTitle"
                defaultMessage="{queryName} details"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  queryName: data?.name,
                }}
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [data?.name, scheduledQueryGroupsListProps]
  );

  const button = useMemo(
    () => (
      <EuiButton iconType="arrowDown" iconSide="right" onClick={showActionsPopover}>
        <FormattedMessage
          id="xpack.osquery.scheduledQueryGroupDetailsPage.actionsButtonLabel"
          defaultMessage="Actions"
        />
      </EuiButton>
    ),
    [showActionsPopover]
  );

  const items = useMemo(
    () => [
      <EuiContextMenuItem key="edit" icon="pencil" {...editQueryLinkProps}>
        <FormattedMessage
          id="xpack.osquery.scheduledQueryGroupDetailsPage.editQueryButtonLabel"
          defaultMessage="Edit"
        />
      </EuiContextMenuItem>,
      data ? (
        <DeleteScheduledQueryGroupButton key="delete" item={data} onSuccess={closeActionsPopover} />
      ) : null,
    ],
    [closeActionsPopover, data, editQueryLinkProps]
  );

  const RightColumn = useMemo(
    () => (
      <EuiFlexGroup justifyContent="flexEnd" direction="row">
        <EuiFlexItem grow={false} key="agents_failed_count">
          {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop */}
          <EuiDescriptionList compressed textStyle="reverse" style={{ textAlign: 'right' }}>
            <EuiDescriptionListTitle className="eui-textNoWrap">
              <FormattedMessage
                id="xpack.osquery.scheduleQueryGroup.kpis.policyLabelText"
                defaultMessage="Policy"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription className="eui-textNoWrap">
              {data?.policy_id ? <AgentsPolicyLink policyId={data?.policy_id} /> : null}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_failed_count_divider">
          <Divider />
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="actions_button">
          <EuiPopover
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closeActionsPopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={items} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [button, closeActionsPopover, data?.policy_id, isPopoverOpen, items]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {data && <ScheduledQueryGroupQueriesTable data={data} />}
    </WithHeaderLayout>
  );
};

export const ScheduledQueryGroupDetailsPage = React.memo(ScheduledQueryGroupDetailsPageComponent);
