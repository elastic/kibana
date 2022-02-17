/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiEmptyPrompt,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { HostMetadata } from '../../../../../../common/endpoint/types';
import { PreferenceFormattedDateFromPrimitive } from '../../../../../common/components/formatted_date';
import { useToasts } from '../../../../../common/lib/kibana';
import { getEndpointDetailsPath } from '../../../../common/routing';
import {
  detailsData,
  detailsError,
  getActivityLogData,
  hostStatusInfo,
  policyResponseActions,
  policyResponseAppliedRevision,
  policyResponseConfigurations,
  policyResponseError,
  policyResponseFailedOrWarningActionCount,
  policyResponseLoading,
  policyResponseTimestamp,
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
} from './components/endpoint_details_tabs';
import { EndpointIsolationFlyoutPanel } from './components/endpoint_isolate_flyout_panel';
import { EndpointDetailsFlyoutHeader } from './components/flyout_header';
import { EndpointActivityLog } from './endpoint_activity_log';
import { EndpointDetailsContent } from './endpoint_details_content';
import { PolicyResponse } from './policy_response';

export const EndpointDetails = memo(() => {
  const toasts = useToasts();
  const queryParams = useEndpointSelector(uiQueryParams);

  const activityLog = useEndpointSelector(getActivityLogData);
  const hostDetails = useEndpointSelector(detailsData);
  const hostDetailsError = useEndpointSelector(detailsError);

  const policyInfo = useEndpointSelector(policyVersionInfo);
  const hostStatus = useEndpointSelector(hostStatusInfo);
  const show = useEndpointSelector(showView);

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
    (id: string) => [
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
      {
        id: EndpointDetailsTabsTypes.activityLog,
        name: i18.ACTIVITY_LOG.tabTitle,
        route: getEndpointDetailsPath({
          ...queryParams,
          name: 'endpointActivityLog',
          selected_endpoint: id,
        }),
        content: <EndpointActivityLog activityLog={activityLog} />,
      },
    ],
    [ContentLoadingMarkup, hostDetails, policyInfo, hostStatus, activityLog, queryParams]
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
              show={show}
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
  const responseConfig = useEndpointSelector(policyResponseConfigurations);
  const responseActions = useEndpointSelector(policyResponseActions);
  const responseAttentionCount = useEndpointSelector(policyResponseFailedOrWarningActionCount);
  const loading = useEndpointSelector(policyResponseLoading);
  const error = useEndpointSelector(policyResponseError);
  const responseTimestamp = useEndpointSelector(policyResponseTimestamp);
  const responsePolicyRevisionNumber = useEndpointSelector(policyResponseAppliedRevision);

  return (
    <>
      <EuiFlyoutBody
        data-test-subj="endpointDetailsPolicyResponseFlyoutBody"
        className="endpointDetailsPolicyResponseFlyoutBody"
      >
        <EuiText data-test-subj="endpointDetailsPolicyResponseFlyoutTitle">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyResponse.title"
              defaultMessage="Policy Response"
            />
          </h4>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued" data-test-subj="endpointDetailsPolicyResponseTimestamp">
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyResponse.appliedOn"
            defaultMessage="Revision {rev} applied on {date}"
            values={{
              rev: responsePolicyRevisionNumber,
              date: <PreferenceFormattedDateFromPrimitive value={responseTimestamp} />,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        {error && (
          <EuiEmptyPrompt
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.noPolicyResponse"
                defaultMessage="No policy response available"
              />
            }
          />
        )}
        {loading && <EuiLoadingContent lines={3} />}
        {responseConfig !== undefined && responseActions !== undefined && (
          <PolicyResponse
            responseConfig={responseConfig}
            responseActions={responseActions}
            responseAttentionCount={responseAttentionCount}
          />
        )}
      </EuiFlyoutBody>
    </>
  );
});

PolicyResponseFlyoutPanel.displayName = 'PolicyResponseFlyoutPanel';
