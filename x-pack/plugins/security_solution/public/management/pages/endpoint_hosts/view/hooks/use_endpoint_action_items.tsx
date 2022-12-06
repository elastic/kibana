/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useWithShowEndpointResponder } from '../../../../hooks';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { APP_UI_ID } from '../../../../../../common/constants';
import { getEndpointDetailsPath } from '../../../../common/routing';
import type { HostMetadata, MaybeImmutable } from '../../../../../../common/endpoint/types';
import { useEndpointSelector } from './hooks';
import { agentPolicies, uiQueryParams } from '../../store/selectors';
import { useAppUrl } from '../../../../../common/lib/kibana/hooks';
import type { ContextMenuItemNavByRouterProps } from '../../../../components/context_menu_with_router_support/context_menu_item_nav_by_router';
import { isEndpointHostIsolated } from '../../../../../common/utils/validators';
import { isIsolationSupported } from '../../../../../../common/endpoint/service/host_isolation/utils';

interface Options {
  isEndpointList: boolean;
}

/**
 * Returns a list (array) of actions for an individual endpoint
 * @param endpointMetadata
 */
export const useEndpointActionItems = (
  endpointMetadata: MaybeImmutable<HostMetadata> | undefined,
  options?: Options
): ContextMenuItemNavByRouterProps[] => {
  const { getAppUrl } = useAppUrl();
  const fleetAgentPolicies = useEndpointSelector(agentPolicies);
  const allCurrentUrlParams = useEndpointSelector(uiQueryParams);
  const showEndpointResponseActionsConsole = useWithShowEndpointResponder();
  const isResponseActionsConsoleEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsConsoleEnabled'
  );
  const {
    canAccessResponseConsole,
    canIsolateHost,
    canUnIsolateHost,
    canAccessEndpointActionsLogManagement,
    canAccessFleet,
  } = useUserPrivileges().endpointPrivileges;

  return useMemo<ContextMenuItemNavByRouterProps[]>(() => {
    if (endpointMetadata) {
      const isIsolated = isEndpointHostIsolated(endpointMetadata);
      const endpointId = endpointMetadata.agent.id;
      const endpointPolicyId = endpointMetadata.Endpoint.policy.applied.id;
      const endpointHostName = endpointMetadata.host.hostname;
      const fleetAgentId = endpointMetadata.elastic.agent.id;
      const isolationSupported = isIsolationSupported({
        osName: endpointMetadata.host.os.name,
        version: endpointMetadata.agent.version,
        capabilities: endpointMetadata.Endpoint.capabilities,
      });
      const {
        show,
        selected_endpoint: _selectedEndpoint,
        ...currentUrlParams
      } = allCurrentUrlParams;
      const endpointActionsPath = getEndpointDetailsPath({
        name: 'endpointActivityLog',
        ...currentUrlParams,
        selected_endpoint: endpointId,
      });
      const endpointIsolatePath = getEndpointDetailsPath({
        name: 'endpointIsolate',
        ...currentUrlParams,
        selected_endpoint: endpointId,
      });
      const endpointUnIsolatePath = getEndpointDetailsPath({
        name: 'endpointUnIsolate',
        ...currentUrlParams,
        selected_endpoint: endpointId,
      });

      const isolationActions = [];

      if (isIsolated && canUnIsolateHost) {
        // Un-isolate is available to users regardless of license level if they have unisolate permissions
        isolationActions.push({
          'data-test-subj': 'unIsolateLink',
          icon: 'lockOpen',
          key: 'unIsolateHost',
          navigateAppId: APP_UI_ID,
          navigateOptions: {
            path: endpointUnIsolatePath,
          },
          href: getAppUrl({ path: endpointUnIsolatePath }),
          children: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.actions.unIsolateHost"
              defaultMessage="Release host"
            />
          ),
        });
      } else if (isolationSupported && canIsolateHost) {
        // For Platinum++ licenses, users also have ability to isolate
        isolationActions.push({
          'data-test-subj': 'isolateLink',
          icon: 'lock',
          key: 'isolateHost',
          navigateAppId: APP_UI_ID,
          navigateOptions: {
            path: endpointIsolatePath,
          },
          href: getAppUrl({ path: endpointIsolatePath }),
          children: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.actions.isolateHost"
              defaultMessage="Isolate host"
            />
          ),
        });
      }

      return [
        ...isolationActions,
        ...(isResponseActionsConsoleEnabled && canAccessResponseConsole
          ? [
              {
                'data-test-subj': 'console',
                icon: 'console',
                key: 'consoleLink',
                onClick: (ev: React.MouseEvent) => {
                  ev.preventDefault();
                  showEndpointResponseActionsConsole(endpointMetadata);
                },
                children: (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.actions.console"
                    defaultMessage="Respond"
                  />
                ),
              },
            ]
          : []),
        ...(options?.isEndpointList && canAccessEndpointActionsLogManagement
          ? [
              {
                'data-test-subj': 'actionsLink',
                icon: 'logoSecurity',
                key: 'actionsLogLink',
                navigateAppId: APP_UI_ID,
                navigateOptions: { path: endpointActionsPath },
                href: getAppUrl({ path: endpointActionsPath }),
                children: (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.actions.responseActionsHistory"
                    defaultMessage="View response actions history"
                  />
                ),
              },
            ]
          : []),
        {
          'data-test-subj': 'hostLink',
          icon: 'logoSecurity',
          key: 'hostDetailsLink',
          navigateAppId: APP_UI_ID,
          navigateOptions: { path: `/hosts/${endpointHostName}` },
          href: getAppUrl({ path: `/hosts/${endpointHostName}` }),
          children: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.actions.hostDetails"
              defaultMessage="View host details"
            />
          ),
        },
        ...(canAccessFleet
          ? [
              {
                icon: 'gear',
                key: 'agentConfigLink',
                'data-test-subj': 'agentPolicyLink',
                navigateAppId: 'fleet',
                navigateOptions: {
                  path: `${
                    pagePathGetters.policy_details({
                      policyId: fleetAgentPolicies[endpointPolicyId],
                    })[1]
                  }`,
                },
                href: `${getAppUrl({ appId: 'fleet' })}${
                  pagePathGetters.policy_details({
                    policyId: fleetAgentPolicies[endpointPolicyId],
                  })[1]
                }`,
                disabled: fleetAgentPolicies[endpointPolicyId] === undefined,
                children: (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.actions.agentPolicy"
                    defaultMessage="View agent policy"
                  />
                ),
              },
              {
                icon: 'gear',
                key: 'agentDetailsLink',
                'data-test-subj': 'agentDetailsLink',
                navigateAppId: 'fleet',
                navigateOptions: {
                  path: `${
                    pagePathGetters.agent_details({
                      agentId: fleetAgentId,
                    })[1]
                  }`,
                },
                href: `${getAppUrl({ appId: 'fleet' })}${
                  pagePathGetters.agent_details({
                    agentId: fleetAgentId,
                  })[1]
                }`,
                children: (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.actions.agentDetails"
                    defaultMessage="View agent details"
                  />
                ),
              },
              {
                icon: 'gear',
                key: 'agentPolicyReassignLink',
                'data-test-subj': 'agentPolicyReassignLink',
                navigateAppId: 'fleet',
                navigateOptions: {
                  path: `${
                    pagePathGetters.agent_details({
                      agentId: fleetAgentId,
                    })[1]
                  }?openReassignFlyout=true`,
                },
                href: `${getAppUrl({ appId: 'fleet' })}${
                  pagePathGetters.agent_details({
                    agentId: fleetAgentId,
                  })[1]
                }?openReassignFlyout=true`,
                children: (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.actions.agentPolicyReassign"
                    defaultMessage="Reassign agent policy"
                  />
                ),
              },
            ]
          : []),
      ];
    }

    return [];
  }, [
    allCurrentUrlParams,
    canAccessResponseConsole,
    canAccessEndpointActionsLogManagement,
    endpointMetadata,
    fleetAgentPolicies,
    getAppUrl,
    isResponseActionsConsoleEnabled,
    showEndpointResponseActionsConsole,
    options?.isEndpointList,
    canIsolateHost,
    canUnIsolateHost,
    canAccessFleet,
  ]);
};
