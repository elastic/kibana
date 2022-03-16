/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import { useNavigateByRouterEventHandler } from '../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../common/lib/kibana/hooks';
import { getEndpointListPath, getPoliciesPath } from '../common/routing';
import { APP_UI_ID } from '../../../common/constants';

/**
 * Returns a link component that navigates to the endpoint list page filtered by a specific policy
 */
export const PolicyEndpointListLink = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    policyId: string;
  }
>(({ policyId, children, ...otherProps }) => {
  const filterByPolicyQuery = `(language:kuery,query:'united.endpoint.Endpoint.policy.applied.id : "${policyId}"')`;
  const { search } = useLocation();
  const { getAppUrl } = useAppUrl();
  const { toRoutePathWithBackOptions, toRouteUrl } = useMemo(() => {
    const endpointListPath = getEndpointListPath({
      name: 'endpointList',
      admin_query: filterByPolicyQuery,
    });
    const policyListPath = getPoliciesPath(search);
    const backLink = {
      navigateTo: [
        APP_UI_ID,
        {
          path: policyListPath,
        },
      ],
      label: i18n.translate('xpack.securitySolution.policy.backToPolicyList', {
        defaultMessage: 'Back to policy list',
      }),
      href: getAppUrl({ path: policyListPath }),
    };
    return {
      toRoutePathWithBackOptions: {
        pathname: getEndpointListPath({ name: 'endpointList' }),
        search: `?admin_query=${filterByPolicyQuery}`,
        state: { backLink },
      },
      toRouteUrl: getAppUrl({ path: endpointListPath }),
    };
  }, [getAppUrl, filterByPolicyQuery, search]);
  const clickHandler = useNavigateByRouterEventHandler(toRoutePathWithBackOptions);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={toRouteUrl} onClick={clickHandler} {...otherProps}>
      {children}
    </EuiLink>
  );
});

PolicyEndpointListLink.displayName = 'PolicyEndpointListLink';
