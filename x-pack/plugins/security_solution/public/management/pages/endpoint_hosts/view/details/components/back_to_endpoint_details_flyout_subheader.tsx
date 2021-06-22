/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FlyoutSubHeader, FlyoutSubHeaderProps } from './flyout_sub_header';
import { getEndpointDetailsPath } from '../../../../../common/routing';
import { useNavigateByRouterEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useFormatUrl } from '../../../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../../../common/constants';
import { useEndpointSelector } from '../../hooks';
import { uiQueryParams } from '../../../store/selectors';

export const BackToEndpointDetailsFlyoutSubHeader = memo<{ endpointId: string }>(
  ({ endpointId }) => {
    const { formatUrl } = useFormatUrl(SecurityPageName.administration);
    const { show, ...currentUrlQueryParams } = useEndpointSelector(uiQueryParams);

    const detailsRoutePath = useMemo(
      () =>
        getEndpointDetailsPath({
          name: 'endpointDetails',
          ...currentUrlQueryParams,
          selected_endpoint: endpointId,
        }),
      [currentUrlQueryParams, endpointId]
    );

    const backToDetailsClickHandler = useNavigateByRouterEventHandler(detailsRoutePath);

    const backButtonProp = useMemo((): FlyoutSubHeaderProps['backButton'] => {
      return {
        title: i18n.translate('xpack.securitySolution.endpoint.policyResponse.backLinkTitle', {
          defaultMessage: 'Endpoint Details',
        }),
        href: formatUrl(detailsRoutePath),
        onClick: backToDetailsClickHandler,
      };
    }, [backToDetailsClickHandler, detailsRoutePath, formatUrl]);

    return (
      <FlyoutSubHeader
        backButton={backButtonProp}
        data-test-subj="endpointDetailsPolicyResponseFlyoutHeader"
      />
    );
  }
);
BackToEndpointDetailsFlyoutSubHeader.displayName = 'BackToEndpointDetailsFlyoutSubHeader';
