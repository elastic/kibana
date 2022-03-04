/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { useNavigateByRouterEventHandler } from '../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../common/lib/kibana/hooks';
import { getEndpointListPath } from '../common/routing';

/**
 * Returns a component that links to the endpoint list page filtered by a specific policy
 */
export const PolicyEndpointListLink = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    policyId: string;
  }
>(({ policyId, children, onClick, ...otherProps }) => {
  const query = `(language:kuery,query:'united.endpoint.Endpoint.policy.applied.id : "${policyId}"')`;
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getEndpointListPath({ name: 'endpointList', admin_query: query });
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl, query]);
  const clickHandler = useNavigateByRouterEventHandler(toRoutePath, onClick);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={toRouteUrl} onClick={clickHandler} {...otherProps}>
      {children}
    </EuiLink>
  );
});

PolicyEndpointListLink.displayName = 'PolicyEndpointListLink';
