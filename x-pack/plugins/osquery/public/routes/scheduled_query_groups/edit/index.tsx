/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { ScheduledQueryGroupForm } from '../../../scheduled_query_groups/form';
import { useScheduledQueryGroup } from '../../../scheduled_query_groups/use_scheduled_query_group';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const EditScheduledQueryGroupPageComponent = () => {
  const { scheduledQueryGroupId } = useParams<{ scheduledQueryGroupId: string }>();
  const queryDetailsLinkProps = useRouterNavigate(
    `scheduled_query_groups/${scheduledQueryGroupId}`
  );

  const { data } = useScheduledQueryGroup({ scheduledQueryGroupId });

  useBreadcrumbs('scheduled_query_group_edit', {
    scheduledQueryGroupId: data?.id ?? '',
    scheduledQueryGroupName: data?.name ?? '',
  });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...queryDetailsLinkProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.editScheduledQuery.viewScheduledQueriesListTitle"
              defaultMessage="View {queryName} details"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ queryName: data?.name }}
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.editScheduledQuery.pageTitle"
                defaultMessage="Edit {queryName}"
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
    [data?.name, queryDetailsLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      {!data ? (
        <EuiLoadingContent lines={10} />
      ) : (
        <ScheduledQueryGroupForm editMode={true} defaultValue={data} />
      )}
    </WithHeaderLayout>
  );
};

export const EditScheduledQueryGroupPage = React.memo(EditScheduledQueryGroupPageComponent);
