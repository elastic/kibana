/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { useEndpointSelector } from '../hooks';
import { nonExistingPolicies } from '../../store/selectors';
import { getPolicyDetailPath } from '../../../../common/routing';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../../common/constants';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';

/**
 * A policy link (to details) that first checks to see if the policy id exists against
 * the `nonExistingPolicies` value in the store. If it does not exist, then regular
 * text is returned.
 */
export const EndpointPolicyLink = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    policyId: string;
  }
>(({ policyId, children, onClick, ...otherProps }) => {
  const missingPolicies = useEndpointSelector(nonExistingPolicies);
  const { formatUrl } = useFormatUrl(SecurityPageName.administration);
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const toPath = getPolicyDetailPath(policyId);
    return {
      toRoutePath: toPath,
      toRouteUrl: formatUrl(toPath),
    };
  }, [formatUrl, policyId]);
  const clickHandler = useNavigateByRouterEventHandler(toRoutePath, onClick);

  if (missingPolicies[policyId]) {
    return (
      <span className={otherProps.className} data-test-subj={otherProps['data-test-subj']}>
        {children}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={toRouteUrl} onClick={clickHandler} {...otherProps}>
      {children}
    </EuiLink>
  );
});

EndpointPolicyLink.displayName = 'EndpointPolicyLink';
