/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
          ? `/live_queries/new?agentPolicyId=${agentPolicyId}`
          : ' `/live_queries/new',
      }),
    [agentPolicyId, getUrlForApp]
  );

  const liveQueryClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToApp('osquery', {
          path: agentPolicyId
            ? `/live_queries/new?agentPolicyId=${agentPolicyId}`
            : ' `/live_queries/new',
        });
      }
    },
    [agentPolicyId, navigateToApp]
  );

  const scheduleQueryGroupsHref = getUrlForApp('osquery', {
    path: integrationPolicyId
      ? `/scheduled_query_groups/${integrationPolicyId}/edit`
      : `/scheduled_query_groups`,
  });

  const scheduleQueryGroupsClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToApp('osquery', {
          path: integrationPolicyId
            ? `/scheduled_query_groups/${integrationPolicyId}/edit`
            : `/scheduled_query_groups`,
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
          title={i18n.translate('xpack.osquery.fleetIntegration.runLiveQueriesButtonText', {
            defaultMessage: 'Run live queries',
          })}
          href={liveQueryHref}
          onClick={liveQueryClick}
          description={''}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xl" type="clock" />}
          title={i18n.translate('xpack.osquery.fleetIntegration.scheduleQueryGroupsButtonText', {
            defaultMessage: 'Schedule query groups',
          })}
          description={''}
          isDisabled={isDisabled}
          href={scheduleQueryGroupsHref}
          onClick={scheduleQueryGroupsClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

NavigationButtonsComponent.displayName = 'NavigationButtonsComponent';

export const NavigationButtons = React.memo(NavigationButtonsComponent);
