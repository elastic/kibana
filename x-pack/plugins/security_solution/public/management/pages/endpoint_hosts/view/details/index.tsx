/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { useCallback, useEffect, useMemo, memo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLoadingContent,
  EuiText,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useToasts } from '../../../../../common/lib/kibana';
import { useEndpointSelector } from '../hooks';
import {
  uiQueryParams,
  detailsData,
  detailsError,
  getActivityLogData,
  showView,
  policyResponseConfigurations,
  policyResponseActions,
  policyResponseFailedOrWarningActionCount,
  policyResponseError,
  policyResponseLoading,
  policyResponseTimestamp,
  policyVersionInfo,
  hostStatusInfo,
  policyResponseAppliedRevision,
} from '../../store/selectors';
import { EndpointDetails } from './endpoint_details';
import { EndpointActivityLog } from './endpoint_activity_log';
import { PolicyResponse } from './policy_response';
import * as i18 from '../translations';
import { HostMetadata } from '../../../../../../common/endpoint/types';
import {
  EndpointDetailsFlyoutTabs,
  EndpointDetailsTabsTypes,
} from './components/endpoint_details_tabs';

import { PreferenceFormattedDateFromPrimitive } from '../../../../../common/components/formatted_date';
import { EndpointIsolationFlyoutPanel } from './components/endpoint_isolate_flyout_panel';
import { BackToEndpointDetailsFlyoutSubHeader } from './components/back_to_endpoint_details_flyout_subheader';
import { FlyoutBodyNoTopPadding } from './components/flyout_body_no_top_padding';
import { getEndpointListPath } from '../../../../common/routing';
import { ActionsMenu } from './components/actions_menu';
import { EndpointIndexUIQueryParams } from '../../types';
import { EndpointAction } from '../../store/action';
import { EndpointDetailsFlyoutHeader } from './components/flyout_header';

export const EndpointDetailsFlyout = memo(() => {
  const dispatch = useDispatch<(action: EndpointAction) => void>();
  const history = useHistory();
  const toasts = useToasts();
  const queryParams = useEndpointSelector(uiQueryParams);
  const {
    selected_endpoint: selectedEndpoint,
    ...queryParamsWithoutSelectedEndpoint
  } = queryParams;

  const activityLog = useEndpointSelector(getActivityLogData);
  const hostDetails = useEndpointSelector(detailsData);
  const hostDetailsError = useEndpointSelector(detailsError);

  const policyInfo = useEndpointSelector(policyVersionInfo);
  const hostStatus = useEndpointSelector(hostStatusInfo);
  const show = useEndpointSelector(showView);

  const setFlyoutView = useCallback(
    (flyoutView: EndpointIndexUIQueryParams['show']) => {
      dispatch({
        type: 'endpointDetailsFlyoutTabChanged',
        payload: {
          flyoutView,
        },
      });
    },
    [dispatch]
  );

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

  const tabs = [
    {
      id: EndpointDetailsTabsTypes.overview,
      name: i18.OVERVIEW,
      content:
        hostDetails === undefined ? (
          ContentLoadingMarkup
        ) : (
          <EndpointDetails details={hostDetails} policyInfo={policyInfo} hostStatus={hostStatus} />
        ),
    },
    {
      id: EndpointDetailsTabsTypes.activityLog,
      name: i18.ACTIVITY_LOG.tabTitle,
      content: <EndpointActivityLog activityLog={activityLog} />,
    },
  ];

  const showFlyoutFooter =
    show === 'details' || show === 'policy_response' || show === 'activity_log';

  const handleFlyoutClose = useCallback(() => {
    const { show: _show, ...urlSearchParams } = queryParamsWithoutSelectedEndpoint;
    history.push(
      getEndpointListPath({
        name: 'endpointList',
        ...urlSearchParams,
      })
    );
    setFlyoutView(undefined);
  }, [setFlyoutView, history, queryParamsWithoutSelectedEndpoint]);

  useEffect(() => {
    setFlyoutView(show);
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
    return () => {
      setFlyoutView(undefined);
    };
  }, [hostDetailsError, setFlyoutView, show, toasts]);

  return (
    <EuiFlyout
      onClose={handleFlyoutClose}
      style={{ zIndex: 4001 }}
      data-test-subj="endpointDetailsFlyout"
      size="m"
      paddingSize="l"
      ownFocus={false}
    >
      {(show === 'policy_response' || show === 'isolate' || show === 'unisolate') && (
        <EndpointDetailsFlyoutHeader hostname={hostDetails?.host?.hostname} />
      )}
      {hostDetails === undefined ? (
        <EuiFlyoutBody>
          <EuiLoadingContent lines={3} /> <EuiSpacer size="l" /> <EuiLoadingContent lines={3} />
        </EuiFlyoutBody>
      ) : (
        <>
          {(show === 'details' || show === 'activity_log') && (
            <EndpointDetailsFlyoutTabs
              hostname={hostDetails?.host?.hostname}
              show={show}
              tabs={tabs}
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
    </EuiFlyout>
  );
});

EndpointDetailsFlyout.displayName = 'EndpointDetailsFlyout';

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
      <BackToEndpointDetailsFlyoutSubHeader endpointId={hostMeta.agent.id} />

      <FlyoutBodyNoTopPadding
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
      </FlyoutBodyNoTopPadding>
    </>
  );
});

PolicyResponseFlyoutPanel.displayName = 'PolicyResponseFlyoutPanel';
