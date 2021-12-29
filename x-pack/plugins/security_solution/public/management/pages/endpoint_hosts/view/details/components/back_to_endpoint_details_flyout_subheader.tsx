/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, CommonProps } from '@elastic/eui';
import { getEndpointDetailsPath } from '../../../../../common/routing';
import { useNavigateByRouterEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useEndpointSelector } from '../../hooks';
import { uiQueryParams } from '../../../store/selectors';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';

type BackButtonProps = CommonProps & {
  backButton?: {
    title: string;
    onClick: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
    href?: string;
  };
};

export const BackToEndpointDetailsFlyoutSubHeader = memo<{ endpointId: string }>(
  ({ endpointId }) => {
    const { getAppUrl } = useAppUrl();
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
    const backButtonProps = useMemo((): BackButtonProps['backButton'] => {
      return {
        title: i18n.translate('xpack.securitySolution.endpoint.policyResponse.backLinkTitle', {
          defaultMessage: 'Endpoint details',
        }),
        href: getAppUrl({ path: detailsRoutePath }),
        onClick: backToDetailsClickHandler,
      };
    }, [backToDetailsClickHandler, getAppUrl, detailsRoutePath]);

    return (
      <div>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButtonEmpty
          flush="both"
          data-test-subj="flyoutSubHeaderBackButton"
          iconType="arrowLeft"
          size="xs"
          href={backButtonProps?.href ?? ''}
          onClick={backButtonProps?.onClick}
        >
          {backButtonProps?.title}
        </EuiButtonEmpty>
      </div>
    );
  }
);
BackToEndpointDetailsFlyoutSubHeader.displayName = 'BackToEndpointDetailsFlyoutSubHeader';
