/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash/fp';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { produce } from 'immer';

import {
  agentRouteService,
  agentPolicyRouteService,
  PackagePolicy,
  AgentPolicy,
} from '../../../fleet/common';
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
  const [policyAgentsCount, setPolicyAgentsCount] = useState<number | null>(null);
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy | null>(null);
  const [editMode] = useState(!!policy);
  const {
    application: { getUrlForApp, navigateToApp },
    http,
  } = useKibana().services;
  const { replace } = useHistory();

  const agentsLinkHref = useMemo(() => {
    if (!policy?.policy_id) return '#';

    return getUrlForApp('fleet', {
      path:
        `#` +
        pagePathGetters.policy_details({ policyId: policy?.policy_id }) +
        '?openEnrollmentFlyout=true',
    });
  }, [getUrlForApp, policy?.policy_id]);

  const liveQueryHref = useMemo(
    () =>
      getUrlForApp('osquery', {
        path: `/live_query/new?agentPolicyId=${policy?.policy_id}`,
      }),
    [getUrlForApp, policy?.policy_id]
  );

  useEffect(() => {
    if (editMode && policyAgentsCount === null) {
      const fetchAgentsCount = async () => {
        try {
          const response = await http.fetch(agentRouteService.getStatusPath(), {
            query: {
              policyId: policy?.policy_id,
            },
          });
          if (response.results) {
            setPolicyAgentsCount(response.results.total);
          }
          // eslint-disable-next-line no-empty
        } catch (e) {}
      };

      const fetchAgentPolicyDetails = async () => {
        if (policy?.policy_id) {
          try {
            const response = await http.fetch(
              agentPolicyRouteService.getInfoPath(policy?.policy_id)
            );
            if (response.item) {
              setAgentPolicy(response.item);
            }
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }
      };

      fetchAgentsCount();
      fetchAgentPolicyDetails();
    }
  }, [editMode, http, policy?.policy_id, policyAgentsCount]);

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
    /*
      by default Fleet set up streams with an empty scheduled query,
      this code removes that, so the user can schedule queries
      in the next step
    */
    if (!editMode) {
      const updatedPolicy = produce(newPolicy, (draft) => {
        draft.inputs[0].streams = [];
        return draft;
      });
      onChange({
        isValid: true,
        updatedPolicy,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editMode) {
      replace({
        state: {
          onSaveNavigateTo: (newPackagePolicy) => [
            'fleet',
            {
              path:
                '#' +
                pagePathGetters.integration_policy_edit({
                  packagePolicyId: newPackagePolicy.id,
                }),
            },
          ],
        } as CreatePackagePolicyRouteState,
      });
    }
  }, [editMode, replace]);

  const detailsClicked = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const scheduledQueriesTableData = useMemo(() => {
    const policyWithoutEmptyQueries = produce(newPolicy, (draft) => {
      draft.inputs[0].streams = filter(['compiled_stream.id', null], draft.inputs[0].streams);
      return draft;
    });

    return policyWithoutEmptyQueries;
  }, [newPolicy]);

  return (
    <>
      {!editMode ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                title="You need to save the integration to deploy Osquery to the picked policy agents"
                iconType="save"
              >
                <p>
                  {`Please be aware that installation process of the Osquery deamon on the Agents
                  can take a while, so if you don't see Live queries please check your Agent logs to
                  make sure that Osquerybeat has been installed and running successfully`}
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      ) : null}
      {policyAgentsCount === 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut title="No agents in the policy" color="warning" iconType="help">
                <p>
                  {`We have detected that you have not assigned yet any agent to the `}
                  {
                    <EuiLink href={agentsLinkHref}>
                      {agentPolicy?.name ?? policy?.policy_id}
                    </EuiLink>
                  }
                  {`. `}
                  <br />
                  <strong>{`Only agents within the policy with active Osquery Manager integration support the functionality presented below.`}</strong>
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      ) : null}
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

      {editMode && scheduledQueriesTableData.inputs[0].streams.length ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <ScheduledQueryQueriesTable data={scheduledQueriesTableData as PackagePolicy} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
});

OsqueryManagedPolicyCreateImportExtension.displayName = 'OsqueryManagedPolicyCreateImportExtension';
