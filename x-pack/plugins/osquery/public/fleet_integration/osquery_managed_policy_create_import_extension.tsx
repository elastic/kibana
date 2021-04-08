/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { PackagePolicy } from '../../../fleet/common';
import {
  pagePathGetters,
  CreatePackagePolicyRouteState,
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../fleet/public';
import { ScheduledQueryQueriesTable } from '../scheduled_queries/scheduled_query_queries_table';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */

export const OsqueryManagedPolicyCreateImportExtension = React.memo<
  PackagePolicyCreateExtensionComponentProps & {
    policy?: PackagePolicyEditExtensionComponentProps['policy'];
  }
>(({ onChange, policy, newPolicy }) => {
  const [editMode] = useState(!!policy);
  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;
  const history = useHistory();

  const liveQueryHref = getUrlForApp('osquery', {
    path: `/live_query/new?agentPolicyId=${policy?.policy_id}`,
  });

  const liveQueryClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToApp('osquery', {
          path: `/live_query/new?agentPolicyId=${policy?.policy_id}`,
        });
      }
    },
    [navigateToApp, policy?.policy_id]
  );

  const scheduleQueriesHref = getUrlForApp('osquery', {
    path: `/scheduled_queries/${policy?.id}/edit`,
  });

  const scheduleQueriesClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToApp('osquery', {
          path: `/scheduled_queries/${policy?.id}/edit`,
        });
      }
    },
    [navigateToApp, policy?.id]
  );

  useEffect(() => {
    if (!editMode) {
      history.replace({
        state: {
          onSaveNavigateTo: (newPackagePolicy) => [
            'fleet',
            {
              path: `#${pagePathGetters.integration_policy_edit({
                packagePolicyId: newPackagePolicy.id,
              })}`,
            },
          ],
        } as CreatePackagePolicyRouteState,
      });
    }
  }, [editMode, history]);

  const detailsClicked = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xl" type="console" />}
            title="Run Live query"
            isDisabled={!editMode}
            href={liveQueryHref}
            onClick={liveQueryClick}
            description="This option will deploy Osquery to the agents, so you can issue live queries"
            footer={
              <EuiButtonEmpty
                iconType="iInCircle"
                size="xs"
                onClick={detailsClicked}
                aria-label="See more details about Osquery live queries"
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
            isDisabled={!editMode}
            description="Run queries on defined interval"
            href={scheduleQueriesHref}
            onClick={scheduleQueriesClick}
            footer={
              <EuiButtonEmpty
                iconType="iInCircle"
                size="xs"
                onClick={detailsClicked}
                aria-label="See more details about Scheduled queries"
              >
                {'More details'}
              </EuiButtonEmpty>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />

      {policy?.inputs[0].streams.length ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <ScheduledQueryQueriesTable data={newPolicy as PackagePolicy} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
});

OsqueryManagedPolicyCreateImportExtension.displayName = 'OsqueryManagedPolicyCreateImportExtension';
