/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlyoutBody, EuiFlyoutFooter, EuiLoadingContent, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { ResponseActionsLog } from '../../../../components/endpoint_response_actions_list/response_actions_log';
import { PolicyResponseWrapper } from '../../../../components/policy_response';
import type { HostMetadata } from '../../../../../../common/endpoint/types';
import { useToasts } from '../../../../../common/lib/kibana';
import { getEndpointDetailsPath } from '../../../../common/routing';
import {
  detailsData,
  detailsError,
  hostStatusInfo,
  policyVersionInfo,
  showView,
  uiQueryParams,
} from '../../store/selectors';
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

  const hostDetails = useEndpointSelector(detailsData);
  const hostDetailsError = useEndpointSelector(detailsError);

  const policyInfo = useEndpointSelector(policyVersionInfo);
  const hostStatus = useEndpointSelector(hostStatusInfo);
  const show = useEndpointSelector(showView);
  const { canAccessEndpointActionsLogManagement } = useUserPrivileges().endpointPrivileges;

  const ContentLoadingMarkup = useMemo(
    () => (
      <>
        <EuiLoadingContent lines={3} />
        <EuiSpacer size="l" />
        <EuiLoadingContent lines={3} />
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
                details={hostDetails}
                policyInfo={policyInfo}
                hostStatus={hostStatus}
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
    [
      canAccessEndpointActionsLogManagement,
      ContentLoadingMarkup,
      hostDetails,
      policyInfo,
      hostStatus,
      queryParams,
    ]
  );

  const showFlyoutFooter =
    show === 'details' || show === 'policy_response' || show === 'activity_log';

  useEffect(() => {
    if (hostDetailsError !== undefined) {
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
          hasBorder
          endpointId={hostDetails?.agent.id}
          hostname={hostDetails?.host?.hostname}
        />
      )}
      {hostDetails === undefined ? (
        <EuiFlyoutBody>
          <EuiLoadingContent lines={3} /> <EuiSpacer size="l" /> <EuiLoadingContent lines={3} />
        </EuiFlyoutBody>
      ) : (
        <>
          {(show === 'details' || show === 'activity_log') && (
            <EndpointDetailsFlyoutTabs
              hostname={hostDetails.host.hostname}
              // show overview tab if forcing response actions history
              // tab via URL without permission
              show={!canAccessEndpointActionsLogManagement ? 'details' : show}
              tabs={getTabs(hostDetails.agent.id)}
            />
          )}

          {show === 'policy_response' && <PolicyResponseFlyoutPanel hostMeta={hostDetails} />}

          {(show === 'isolate' || show === 'unisolate') && (
            <EndpointIsolationFlyoutPanel hostMeta={hostDetails} />
          )}

          {showFlyoutFooter && (
            <EuiFlyoutFooter className="eui-textRight" data-test-subj="endpointDetailsFlyoutFooter">
              <ActionsMenu />
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
