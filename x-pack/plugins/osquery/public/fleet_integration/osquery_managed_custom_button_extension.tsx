/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import { PackageCustomExtensionComponentProps } from '../../../fleet/public';
import { useRouterNavigate } from '../common/lib/kibana';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app custom tab
 */
export const OsqueryManagedCustomButtonExtension = React.memo<PackageCustomExtensionComponentProps>(
  () => {
    const liveQueriesProps = useRouterNavigate('live_queries');
    const scheduledQueriesProps = useRouterNavigate('scheduled_queries');

    return (
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xl" type="console" />}
            title="Run live queries"
            {...liveQueriesProps}
            description={''}
            footer={
              <EuiButtonEmpty
                iconType="iInCircle"
                size="xs"
                href="http://google.com"
                aria-label="See more details about Live queries"
              >
                {'More details'}
              </EuiButtonEmpty>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xl" type="clock" />}
            title="Schedule queries"
            description={''}
            {...scheduledQueriesProps}
            footer={
              <EuiButtonEmpty
                iconType="iInCircle"
                size="xs"
                href="http://google.com"
                aria-label="See more details about Scheduled query groups"
              >
                {'More details'}
              </EuiButtonEmpty>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
OsqueryManagedCustomButtonExtension.displayName = 'OsqueryManagedCustomButtonExtension';
