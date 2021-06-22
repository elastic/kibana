/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import { APP_ID, SecurityPageName } from '../../../../../../common/constants';
import { pagePathGetters } from '../../../../../../../fleet/public';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { HostMetadata, MaybeImmutable } from '../../../../../../common/endpoint/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { useEndpointSelector } from './hooks';
import { agentPolicies, uiQueryParams } from '../../store/selectors';
import { useKibana } from '../../../../../common/lib/kibana';
import { ContextMenuItemNavByRouterProps } from '../components/context_menu_item_nav_by_rotuer';
import { isEndpointHostIsolated } from '../../../../../common/utils/validators';
import { useLicense } from '../../../../../common/hooks/use_license';

/**
 * Returns a list (array) of actions for an individual endpoint
 * @param endpointMetadata
 */
export const useEndpointActionItems = (
  endpointMetadata: MaybeImmutable<HostMetadata> | undefined
): ContextMenuItemNavByRouterProps[] => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const { formatUrl } = useFormatUrl(SecurityPageName.administration);
  const fleetAgentPolicies = useEndpointSelector(agentPolicies);
  const allCurrentUrlParams = useEndpointSelector(uiQueryParams);
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useKibana();

  return useMemo<ContextMenuItemNavByRouterProps[]>(() => {
    if (endpointMetadata) {
      const isIsolated = isEndpointHostIsolated(endpointMetadata);
      const endpointId = endpointMetadata.agent.id;
      const endpointPolicyId = endpointMetadata.Endpoint.policy.applied.id;
      const endpointHostName = endpointMetadata.host.hostname;
      const fleetAgentId = endpointMetadata.elastic.agent.id;
      const {
        show,
        selected_endpoint: _selectedEndpoint,
        ...currentUrlParams
      } = allCurrentUrlParams;
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

      if (isIsolated) {
        // Un-isolate is always available to users regardless of license level
        isolationActions.push({
          'data-test-subj': 'unIsolateLink',
          icon: 'logoSecurity',
          key: 'unIsolateHost',
          navigateAppId: MANAGEMENT_APP_ID,
          navigateOptions: {
            path: endpointUnIsolatePath,
          },
          href: formatUrl(endpointUnIsolatePath),
          children: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.actions.unIsolateHost"
              defaultMessage="Release host"
            />
          ),
        });
      } else if (isPlatinumPlus) {
        // For Platinum++ licenses, users also have ability to isolate
        isolationActions.push({
          'data-test-subj': 'isolateLink',
          icon: 'logoSecurity',
          key: 'isolateHost',
          navigateAppId: MANAGEMENT_APP_ID,
          navigateOptions: {
            path: endpointIsolatePath,
          },
          href: formatUrl(endpointIsolatePath),
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
        {
          'data-test-subj': 'hostLink',
          icon: 'logoSecurity',
          key: 'hostDetailsLink',
          navigateAppId: APP_ID,
          navigateOptions: { path: `hosts/${endpointHostName}` },
          href: `${getUrlForApp('securitySolution')}/hosts/${endpointHostName}`,
          children: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.actions.hostDetails"
              defaultMessage="View host details"
            />
          ),
        },
        {
          icon: 'gear',
          key: 'agentConfigLink',
          'data-test-subj': 'agentPolicyLink',
          navigateAppId: 'fleet',
          navigateOptions: {
            path: `#${
              pagePathGetters.policy_details({
                policyId: fleetAgentPolicies[endpointPolicyId],
              })[1]
            }`,
          },
          href: `${getUrlForApp('fleet')}#${
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
            path: `#${
              pagePathGetters.agent_details({
                agentId: fleetAgentId,
              })[1]
            }`,
          },
          href: `${getUrlForApp('fleet')}#${
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
            path: `#${
              pagePathGetters.agent_details({
                agentId: fleetAgentId,
              })[1]
            }/activity?openReassignFlyout=true`,
          },
          href: `${getUrlForApp('fleet')}#${
            pagePathGetters.agent_details({
              agentId: fleetAgentId,
            })[1]
          }/activity?openReassignFlyout=true`,
          children: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.actions.agentPolicyReassign"
              defaultMessage="Reassign agent policy"
            />
          ),
        },
      ];
    }

    return [];
  }, [
    allCurrentUrlParams,
    endpointMetadata,
    fleetAgentPolicies,
    formatUrl,
    getUrlForApp,
    isPlatinumPlus,
  ]);
};
