/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startCase } from 'lodash';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { ScheduledQueryGroupForm } from '../../../scheduled_query_groups/form';
import { useOsqueryIntegrationStatus } from '../../../common/hooks';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const AddScheduledQueryGroupPageComponent = () => {
  useBreadcrumbs('scheduled_query_group_add');
  const scheduledQueryListProps = useRouterNavigate('scheduled_query_groups');
  const { data: osqueryIntegration } = useOsqueryIntegrationStatus();

  const packageInfo = useMemo(() => {
    if (!osqueryIntegration) return;

    return {
      name: osqueryIntegration.name,
      title: osqueryIntegration.title ?? startCase(osqueryIntegration.name),
      version: osqueryIntegration.version,
    };
  }, [osqueryIntegration]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...scheduledQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.addScheduledQueryGroup.viewScheduledQueryGroupsListTitle"
              defaultMessage="View all scheduled query groups"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.addScheduledQueryGroup.pageTitle"
                defaultMessage="Add scheduled query group"
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [scheduledQueryListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      {packageInfo && <ScheduledQueryGroupForm packageInfo={packageInfo} />}
    </WithHeaderLayout>
  );
};

export const AddScheduledQueryGroupPage = React.memo(AddScheduledQueryGroupPageComponent);
