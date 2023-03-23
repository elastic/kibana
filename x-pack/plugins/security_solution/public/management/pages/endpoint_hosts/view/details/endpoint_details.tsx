/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlyoutBody, EuiFlyoutFooter, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { useGetEndpointDetails } from '../../../../hooks';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { ResponseActionsLog } from '../../../../components/endpoint_response_actions_list/response_actions_log';
import { PolicyResponseWrapper } from '../../../../components/policy_response';
import type { HostMetadata } from '../../../../../../common/endpoint/types';
import { useToasts } from '../../../../../common/lib/kibana';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { showView, uiQueryParams } from '../../store/selectors';
import { useEndpointSelector } from '../hooks';
import * as i18 from '../translations';
import { ActionsMenu } from './components/actions_menu';
import {
  EndpointDetailsFlyoutTabs,
  EndpointDetailsTabsTypes,
  type EndpointDetailsTabs,
} from './components/endpoint_details_tabs';
import { EndpointIsolationFlyoutPanel } from './components/endpoint_isolate_flyout_panel';
import { EndpointDetailsFlyoutHeader } from './components/flyout_header';
import { EndpointDetailsContent } from './endpoint_details_content';

export const EndpointDetails = memo(() => {
  const toasts = useToasts();
  const queryParams = useEndpointSelector(uiQueryParams);

  const {
    data: hostDetails,
    error: hostDetailsError,
    isFetching: isHostDetailsLoading,
  } = useGetEndpointDetails(queryParams.selected_endpoint ?? '');

  const show = useEndpointSelector(showView);
  const { canAccessEndpointActionsLogManagement } = useUserPrivileges().endpointPrivileges;

  const ContentLoadingMarkup = useMemo(
    () => (
      <>
        <EuiSkeletonText lines={3} />
        <EuiSpacer size="l" />
        <EuiSkeletonText lines={3} />
      </>
    ),
    []
  );

  const getTabs = useCallback(
    (id: string): EndpointDetailsTabs[] => {
      const tabs: EndpointDetailsTabs[] = [
        {
          id: EndpointDetailsTabsTypes.overview,
          name: i18.OVERVIEW,
          route: getEndpointDetailsPath({
            ...queryParams,
            name: 'endpointDetails',
            selected_endpoint: id,
          }),
          content:
            hostDetails === undefined ? (
              ContentLoadingMarkup
            ) : (
              <EndpointDetailsContent
                details={hostDetails.metadata}
                policyInfo={hostDetails.policy_info}
                hostStatus={hostDetails.host_status}
              />
            ),
        },
      ];

      // show the response actions history tab
      // only when the user has the required permission
      if (canAccessEndpointActionsLogManagement) {
        tabs.push({
          id: EndpointDetailsTabsTypes.activityLog,
          name: i18.ACTIVITY_LOG.tabTitle,
          route: getEndpointDetailsPath({
            ...queryParams,
            name: 'endpointActivityLog',
            selected_endpoint: id,
          }),
          content: <ResponseActionsLog agentIds={id} />,
        });
      }
      return tabs;
    },
    [canAccessEndpointActionsLogManagement, ContentLoadingMarkup, hostDetails, queryParams]
  );

  const showFlyoutFooter =
    show === 'details' || show === 'policy_response' || show === 'activity_log';

  useEffect(() => {
    if (hostDetailsError !== null) {
      toasts.addDanger({
        title: i18n.translate('xpack.securitySolution.endpoint.details.errorTitle', {
          defaultMessage: 'Could not find host',
        }),
        text: i18n.translate('xpack.securitySolution.endpoint.details.errorBody', {
          defaultMessage: 'Please exit the flyout and select an available host.',
        }),
      });
    }
  }, [hostDetailsError, show, toasts]);

  return (
    <>
      {(show === 'policy_response' || show === 'isolate' || show === 'unisolate') && (
        <EndpointDetailsFlyoutHeader
          isHostDetailsLoading={isHostDetailsLoading}
          hasBorder
          endpointId={hostDetails?.metadata.agent.id}
          hostname={hostDetails?.metadata.host?.hostname}
        />
      )}
      {hostDetails === undefined ? (
        <EuiFlyoutBody>
          <EuiSkeletonText lines={3} /> <EuiSpacer size="l" /> <EuiSkeletonText lines={3} />
        </EuiFlyoutBody>
      ) : (
        <>
          {(show === 'details' || show === 'activity_log') && (
            <EndpointDetailsFlyoutTabs
              hostname={hostDetails?.metadata.host.hostname}
              isHostDetailsLoading={isHostDetailsLoading}
              // show overview tab if forcing response actions history
              // tab via URL without permission
              show={!canAccessEndpointActionsLogManagement ? 'details' : show}
              tabs={getTabs(hostDetails?.metadata.agent.id)}
            />
          )}

          {show === 'policy_response' && (
            <PolicyResponseFlyoutPanel hostMeta={hostDetails?.metadata} />
          )}

          {(show === 'isolate' || show === 'unisolate') && (
            <EndpointIsolationFlyoutPanel hostMeta={hostDetails?.metadata} />
          )}

          {showFlyoutFooter && (
            <EuiFlyoutFooter className="eui-textRight" data-test-subj="endpointDetailsFlyoutFooter">
              <ActionsMenu hostMetadata={hostDetails?.metadata} />
            </EuiFlyoutFooter>
          )}
        </>
      )}
    </>
  );
});

EndpointDetails.displayName = 'EndpointDetails';

const PolicyResponseFlyoutPanel = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  return (
    <>
      <EuiFlyoutBody
        data-test-subj="endpointDetailsPolicyResponseFlyoutBody"
        className="endpointDetailsPolicyResponseFlyoutBody"
      >
        <PolicyResponseWrapper endpointId={hostMeta.agent.id} />
      </EuiFlyoutBody>
    </>
  );
});

PolicyResponseFlyoutPanel.displayName = 'PolicyResponseFlyoutPanel';
