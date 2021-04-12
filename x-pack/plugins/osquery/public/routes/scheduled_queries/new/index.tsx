/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { ScheduledQueryForm } from '../../../scheduled_queries/form';
import { useOsqueryIntegration } from '../../../common/hooks';

const NewScheduledQueryPageComponent = () => {
  const scheduledQueryListProps = useRouterNavigate('scheduled_queries');
  const { data: osqueryIntegration } = useOsqueryIntegration();

  const packageInfo = useMemo(() => {
    if (!osqueryIntegration) return;

    return {
      name: osqueryIntegration.name,
      title: osqueryIntegration.title,
      version: osqueryIntegration.version,
    };
  }, [osqueryIntegration]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...scheduledQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.newScheduledQuery.viewScheduledQueriesListTitle"
              defaultMessage="View all live queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.newScheduledQuery.pageTitle"
                defaultMessage="New scheduled query"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        {/* <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.newScheduledQuery.pageSubtitle"
                defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            </p>
          </EuiText>
        </EuiFlexItem> */}
      </EuiFlexGroup>
    ),
    [scheduledQueryListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      {packageInfo && <ScheduledQueryForm packageInfo={packageInfo} />}
    </WithHeaderLayout>
  );
};

export const NewScheduledQueryPage = React.memo(NewScheduledQueryPageComponent);
