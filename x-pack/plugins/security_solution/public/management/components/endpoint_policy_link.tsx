/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { getPolicyDetailPath } from '../common/routing';
import { useNavigateByRouterEventHandler } from '../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../common/lib/kibana/hooks';

/**
 * A policy link (to details) that first checks to see if the policy id exists against
 * the `nonExistingPolicies` value in the store. If it does not exist, then regular
 * text is returned.
 */
export const EndpointPolicyLink = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    policyId: string;
    missingPolicies?: Record<string, boolean>;
  }
>(({ policyId, children, onClick, missingPolicies = {}, ...otherProps }) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getPolicyDetailPath(policyId);
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [policyId, getAppUrl]);
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
