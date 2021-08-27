/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { produce } from 'immer';

import {
  agentRouteService,
  agentPolicyRouteService,
  AgentPolicy,
  PLUGIN_ID,
  NewPackagePolicy,
} from '../../../fleet/common';
import {
  pagePathGetters,
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../fleet/public';
import { ScheduledQueryGroupQueriesTable } from '../scheduled_query_groups/scheduled_query_group_queries_table';
import { useKibana } from '../common/lib/kibana';
import { NavigationButtons } from './navigation_buttons';
import { DisabledCallout } from './disabled_callout';
import { OsqueryManagerPackagePolicy } from '../../common/types';

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
    application: { getUrlForApp },
    http,
  } = useKibana().services;
  const { state: locationState } = useLocation();
  const { go } = useHistory();

  const agentsLinkHref = useMemo(() => {
    if (!policy?.policy_id) return '#';

    return getUrlForApp(PLUGIN_ID, {
      path:
        `#` +
        pagePathGetters.policy_details({ policyId: policy?.policy_id })[1] +
        '?openEnrollmentFlyout=true',
    });
  }, [getUrlForApp, policy?.policy_id]);

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

  useEffect(() => {
    /*
      in order to enable Osquery side nav we need to refresh the whole Kibana
      TODO: Find a better solution
    */
    if (editMode && locationState?.forceRefresh) {
      go(0);
    }
  }, [editMode, go, locationState]);

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

  // TODO: Find a better solution
  // useEffect(() => {
  //   if (!editMode) {
  //     replace({
  //       state: {
  //         onSaveNavigateTo: (newPackagePolicy) => [
  //           INTEGRATIONS_PLUGIN_ID,
  //           {
  //             path:
  //               '#' +
  //               pagePathGetters.integration_policy_edit({
  //                 packagePolicyId: newPackagePolicy.id,
  //               })[1],
  //             state: {
  //               forceRefresh: true,
  //             },
  //           },
  //         ],
  //       } as CreatePackagePolicyRouteState,
  //     });
  //   }
  // }, [editMode, replace]);

  const scheduledQueryGroupTableData = useMemo(() => {
    const policyWithoutEmptyQueries = produce<
      NewPackagePolicy,
      OsqueryManagerPackagePolicy,
      OsqueryManagerPackagePolicy
    >(newPolicy, (draft) => {
      draft.inputs[0].streams = filter(['compiled_stream.id', null], draft.inputs[0].streams);
      return draft;
    });

    return policyWithoutEmptyQueries;
  }, [newPolicy]);

  return (
    <>
      {!editMode ? <DisabledCallout /> : null}
      {policyAgentsCount === 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut title="No agents in the policy" color="warning" iconType="help">
                <p>
                  {`Fleet has detected that you have not assigned yet any agent to the `}
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

      <NavigationButtons
        isDisabled={!editMode}
        integrationPolicyId={policy?.id}
        agentPolicyId={policy?.policy_id}
      />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />

      {editMode && scheduledQueryGroupTableData.inputs[0].streams.length ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <ScheduledQueryGroupQueriesTable
              data={scheduledQueryGroupTableData.inputs[0].streams}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
});

OsqueryManagedPolicyCreateImportExtension.displayName = 'OsqueryManagedPolicyCreateImportExtension';
