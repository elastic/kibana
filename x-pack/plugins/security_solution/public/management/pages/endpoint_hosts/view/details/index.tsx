/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, memo, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingContent,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useHostSelector } from '../hooks';
import { urlFromQueryParams } from '../url_from_query_params';
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
} from '../../store/selectors';
import { HostDetails } from './host_details';
import { PolicyResponse } from './policy_response';
import { HostMetadata } from '../../../../../../common/endpoint/types';
import { FlyoutSubHeader, FlyoutSubHeaderProps } from './components/flyout_sub_header';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { getHostListPath } from '../../../../common/routing';
import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';

export const HostDetailsFlyout = memo(() => {
  const history = useHistory();
  const { notifications } = useKibana();
  const queryParams = useHostSelector(uiQueryParams);
  const { selected_host: selectedHost, ...queryParamsWithoutSelectedHost } = queryParams;
  const details = useHostSelector(detailsData);
  const loading = useHostSelector(detailsLoading);
  const error = useHostSelector(detailsError);
  const show = useHostSelector(showView);

  const handleFlyoutClose = useCallback(() => {
    history.push(urlFromQueryParams(queryParamsWithoutSelectedHost));
  }, [history, queryParamsWithoutSelectedHost]);

  useEffect(() => {
    if (error !== undefined) {
      notifications.toasts.danger({
        title: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.host.details.errorTitle"
            defaultMessage="Could not find host"
          />
        ),
        body: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.host.details.errorBody"
            defaultMessage="Please exit the flyout and select an available host."
          />
        ),
        toastLifeTimeMs: 10000,
      });
    }
  }, [error, notifications.toasts]);

  return (
    <EuiFlyout onClose={handleFlyoutClose} data-test-subj="hostDetailsFlyout" size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 data-test-subj="hostDetailsFlyoutTitle">
            {loading ? <EuiLoadingContent lines={1} /> : details?.host?.hostname}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {details === undefined ? (
        <>
          <EuiFlyoutBody>
            <EuiLoadingContent lines={3} /> <EuiSpacer size="l" /> <EuiLoadingContent lines={3} />
          </EuiFlyoutBody>
        </>
      ) : (
        <>
          {show === 'details' && (
            <>
              <EuiFlyoutBody data-test-subj="hostDetailsFlyoutBody">
                <HostDetails details={details} />
              </EuiFlyoutBody>
            </>
          )}
          {show === 'policy_response' && <PolicyResponseFlyoutPanel hostMeta={details} />}
        </>
      )}
    </EuiFlyout>
  );
});

HostDetailsFlyout.displayName = 'HostDetailsFlyout';

const PolicyResponseFlyoutPanel = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  const { show, ...queryParams } = useHostSelector(uiQueryParams);
  const responseConfig = useHostSelector(policyResponseConfigurations);
  const responseActions = useHostSelector(policyResponseActions);
  const responseAttentionCount = useHostSelector(policyResponseFailedOrWarningActionCount);
  const loading = useHostSelector(policyResponseLoading);
  const error = useHostSelector(policyResponseError);
  const { formatUrl } = useFormatUrl(SecurityPageName.management);
  const [detailsUri, detailsRoutePath] = useMemo(
    () => [
      formatUrl(
        getHostListPath({
          name: 'hostList',
          ...queryParams,
          selected_host: hostMeta.host.id,
        })
      ),
      getHostListPath({
        name: 'hostList',
        ...queryParams,
        selected_host: hostMeta.host.id,
      }),
    ],
    [hostMeta.host.id, formatUrl, queryParams]
  );
  const backToDetailsClickHandler = useNavigateByRouterEventHandler(detailsRoutePath);
  const backButtonProp = useMemo((): FlyoutSubHeaderProps['backButton'] => {
    return {
      title: i18n.translate('xpack.securitySolution.endpoint.host.policyResponse.backLinkTitle', {
        defaultMessage: 'Endpoint Details',
      }),
      href: detailsUri,
      onClick: backToDetailsClickHandler,
    };
  }, [backToDetailsClickHandler, detailsUri]);

  return (
    <>
      <FlyoutSubHeader
        backButton={backButtonProp}
        data-test-subj="hostDetailsPolicyResponseFlyoutHeader"
      />
      <EuiFlyoutBody data-test-subj="hostDetailsPolicyResponseFlyoutBody">
        <EuiText data-test-subj="hostDetailsPolicyResponseFlyoutTitle">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.host.policyResponse.title"
              defaultMessage="Policy Response"
            />
          </h4>
        </EuiText>
        {error && (
          <EuiEmptyPrompt
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostDetails.noPolicyResponse"
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
