/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, memo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingContent,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiToolTip,
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
  showView,
  detailsLoading,
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
import { PolicyResponse } from './policy_response';
import { HostMetadata } from '../../../../../../common/endpoint/types';
import { PreferenceFormattedDateFromPrimitive } from '../../../../../common/components/formatted_date';
import { EndpointIsolateFlyoutPanel } from './components/endpoint_isolate_flyout_panel';
import { BackToEndpointDetailsFlyoutSubHeader } from './components/back_to_endpoint_details_flyout_subheader';
import { FlyoutBodyNoTopPadding } from './components/flyout_body_no_top_padding';
import { getEndpointListPath } from '../../../../common/routing';

export const EndpointDetailsFlyout = memo(() => {
  const history = useHistory();
  const toasts = useToasts();
  const queryParams = useEndpointSelector(uiQueryParams);
  const {
    selected_endpoint: selectedEndpoint,
    ...queryParamsWithoutSelectedEndpoint
  } = queryParams;
  const details = useEndpointSelector(detailsData);
  const policyInfo = useEndpointSelector(policyVersionInfo);
  const hostStatus = useEndpointSelector(hostStatusInfo);
  const loading = useEndpointSelector(detailsLoading);
  const error = useEndpointSelector(detailsError);
  const show = useEndpointSelector(showView);

  const handleFlyoutClose = useCallback(() => {
    const { show: _show, ...urlSearchParams } = queryParamsWithoutSelectedEndpoint;
    history.push(
      getEndpointListPath({
        name: 'endpointList',
        ...urlSearchParams,
      })
    );
  }, [history, queryParamsWithoutSelectedEndpoint]);

  useEffect(() => {
    if (error !== undefined) {
      toasts.addDanger({
        title: i18n.translate('xpack.securitySolution.endpoint.details.errorTitle', {
          defaultMessage: 'Could not find host',
        }),
        text: i18n.translate('xpack.securitySolution.endpoint.details.errorBody', {
          defaultMessage: 'Please exit the flyout and select an available host.',
        }),
      });
    }
  }, [error, toasts]);

  return (
    <EuiFlyout
      onClose={handleFlyoutClose}
      style={{ zIndex: 4001 }}
      data-test-subj="endpointDetailsFlyout"
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        {loading ? (
          <EuiLoadingContent lines={1} />
        ) : (
          <EuiToolTip content={details?.host?.hostname} anchorClassName="eui-textTruncate">
            <EuiTitle size="s">
              <h2
                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                data-test-subj="endpointDetailsFlyoutTitle"
              >
                {details?.host?.hostname}
              </h2>
            </EuiTitle>
          </EuiToolTip>
        )}
      </EuiFlyoutHeader>
      {details === undefined ? (
        <EuiFlyoutBody>
          <EuiLoadingContent lines={3} /> <EuiSpacer size="l" /> <EuiLoadingContent lines={3} />
        </EuiFlyoutBody>
      ) : (
        <>
          {show === 'details' && (
            <EuiFlyoutBody data-test-subj="endpointDetailsFlyoutBody">
              <EndpointDetails details={details} policyInfo={policyInfo} hostStatus={hostStatus} />
            </EuiFlyoutBody>
          )}

          {show === 'policy_response' && <PolicyResponseFlyoutPanel hostMeta={details} />}

          {show === 'isolate' && <EndpointIsolateFlyoutPanel hostMeta={details} />}
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
