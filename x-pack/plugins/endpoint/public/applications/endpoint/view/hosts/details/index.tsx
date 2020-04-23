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
  EuiTitle,
  EuiLoadingContent,
  EuiSpacer,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useHostListSelector } from '../hooks';
import { urlFromQueryParams } from '../url_from_query_params';
import { uiQueryParams, detailsData, detailsError, showView } from '../../../store/hosts/selectors';
import { HostDetails } from './host_details';
import { PolicyResponse } from './policy_response';
import { HostMetadata } from '../../../../../../common/types';
import { FlyoutSubHeader, FlyoutSubHeaderProps } from './components/flyout_sub_header';
import { useNavigateByRouterEventHandler } from '../../hooks/use_navigate_by_router_event_handler';

export const HostDetailsFlyout = memo(() => {
  const history = useHistory();
  const { notifications } = useKibana();
  const queryParams = useHostListSelector(uiQueryParams);
  const { selected_host: selectedHost, ...queryParamsWithoutSelectedHost } = queryParams;
  const details = useHostListSelector(detailsData);
  const error = useHostListSelector(detailsError);
  const show = useHostListSelector(showView);

  const handleFlyoutClose = useCallback(() => {
    history.push(urlFromQueryParams(queryParamsWithoutSelectedHost));
  }, [history, queryParamsWithoutSelectedHost]);

  useEffect(() => {
    if (error !== undefined) {
      notifications.toasts.danger({
        title: (
          <FormattedMessage
            id="xpack.endpoint.host.details.errorTitle"
            defaultMessage="Could not find host"
          />
        ),
        body: (
          <FormattedMessage
            id="xpack.endpoint.host.details.errorBody"
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
            {details === undefined ? <EuiLoadingContent lines={1} /> : details.host.hostname}
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

const PolicyResponseFlyoutPanel = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  const { show, ...queryParams } = useHostListSelector(uiQueryParams);
  const detailsUri = useMemo(
    () =>
      urlFromQueryParams({
        ...queryParams,
        selected_host: hostMeta.host.id,
      }),
    [hostMeta.host.id, queryParams]
  );
  const backToDetailsClickHandler = useNavigateByRouterEventHandler(detailsUri);
  const backButtonProp = useMemo((): FlyoutSubHeaderProps['backButton'] => {
    return {
      title: i18n.translate('xpack.endpoint.host.policyResponse.backLinkTitle', {
        defaultMessage: 'Endpoint Details',
      }),
      href: '?' + detailsUri.search,
      onClick: backToDetailsClickHandler,
    };
  }, [backToDetailsClickHandler, detailsUri.search]);

  return (
    <>
      <FlyoutSubHeader
        backButton={backButtonProp}
        data-test-subj="hostDetailsPolicyResponseFlyoutHeader"
      >
        <EuiTitle size="xxs" data-test-subj="hostDetailsPolicyResponseFlyoutTitle">
          <h3>
            <FormattedMessage
              id="xpack.endpoint.host.policyResponse.title"
              defaultMessage="Policy Response"
            />
          </h3>
        </EuiTitle>
      </FlyoutSubHeader>
      <EuiFlyoutBody data-test-subj="hostDetailsPolicyResponseFlyoutBody">
        <PolicyResponse />
      </EuiFlyoutBody>
    </>
  );
});
