/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { ScheduledQueryGroupsTable } from '../../../scheduled_query_groups/scheduled_query_groups_table';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const ScheduledQueryGroupsPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const newQueryLinkProps = useRouterNavigate('scheduled_query_groups/add');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryList.pageTitle"
                defaultMessage="Scheduled query groups"
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton
        fill
        {...newQueryLinkProps}
        iconType="plusInCircle"
        isDisabled={!permissions.writePacks}
      >
        <FormattedMessage
          id="xpack.osquery.scheduledQueryList.addScheduledQueryButtonLabel"
          defaultMessage="Add scheduled query group"
        />
      </EuiButton>
    ),
    [newQueryLinkProps, permissions.writePacks]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      <ScheduledQueryGroupsTable />
    </WithHeaderLayout>
  );
};

export const ScheduledQueryGroupsPage = React.memo(ScheduledQueryGroupsPageComponent);
