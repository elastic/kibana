/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiLinkAnchorProps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import { useAppUrl } from '../../../../../common/lib/kibana';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { getEndpointListPath, getPoliciesPath } from '../../../../common/routing';
import { APP_UI_ID } from '../../../../../../common/constants';

/**
 * @param policyId
 * @param nonLinkCondition: boolean where the returned component is just text and not a link
 *
 * Returns a link component that navigates to the endpoint list page filtered by a specific policy
 */
export const PolicyEndpointCount = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    policyId: string;
    nonLinkCondition: boolean;
  }
>(({ policyId, nonLinkCondition, children, ...otherProps }) => {
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

  if (nonLinkCondition) {
    return <EuiText size="s">{children}</EuiText>;
  }
  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={toRouteUrl} onClick={clickHandler} {...otherProps}>
      {children}
    </EuiLink>
  );
});

PolicyEndpointCount.displayName = 'PolicyEndpointCount';
