/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon, EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';

interface NavigationButtonsProps {
  isDisabled?: boolean;
  integrationPolicyId?: string;
  agentPolicyId?: string;
}

const NavigationButtonsComponent: React.FC<NavigationButtonsProps> = ({
  isDisabled,
  integrationPolicyId,
  agentPolicyId,
}) => {
  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;

  const liveQueryHref = useMemo(
    () =>
      getUrlForApp('osquery', {
        path: agentPolicyId
          ? `/live_query/new?agentPolicyId=${agentPolicyId}`
          : ' `/live_query/new',
      }),
    [agentPolicyId, getUrlForApp]
  );

  const liveQueryClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToApp('osquery', {
          path: agentPolicyId
            ? `/live_query/new?agentPolicyId=${agentPolicyId}`
            : ' `/live_query/new',
        });
      }
    },
    [agentPolicyId, navigateToApp]
  );

  const scheduleQueriesHref = getUrlForApp('osquery', {
    path: integrationPolicyId
      ? `/scheduled_queries/${integrationPolicyId}/edit`
      : `/scheduled_queries`,
  });

  const scheduleQueriesClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToApp('osquery', {
          path: integrationPolicyId
            ? `/scheduled_queries/${integrationPolicyId}/edit`
            : `/scheduled_queries`,
        });
      }
    },
    [navigateToApp, integrationPolicyId]
  );

  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xl" type="console" />}
          title="Run live queries"
          href={liveQueryHref}
          onClick={liveQueryClick}
          description={''}
          isDisabled={isDisabled}
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
          isDisabled={isDisabled}
          href={scheduleQueriesHref}
          onClick={scheduleQueriesClick}
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
};

NavigationButtonsComponent.displayName = 'NavigationButtonsComponent';

export const NavigationButtons = React.memo(NavigationButtonsComponent);
