/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiLinkAnchorProps } from '@elastic/eui';
import { EuiLink, EuiText, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getPolicyDetailPath } from '../common/routing';
import { useNavigateByRouterEventHandler } from '../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../common/lib/kibana/hooks';
import type { PolicyDetailsRouteState } from '../../../common/endpoint/types';

/**
 * A policy link (to details) that first checks to see if the policy id exists against
 * the `nonExistingPolicies` value in the store. If it does not exist, then regular
 * text is returned.
 */
export const EndpointPolicyLink = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    policyId: string;
    missingPolicies?: Record<string, boolean>;
    backLink?: PolicyDetailsRouteState['backLink'];
  }
>(({ policyId, backLink, children, missingPolicies = {}, ...otherProps }) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = policyId ? getPolicyDetailPath(policyId) : '';
    return {
      toRoutePath: backLink ? { pathname: path, state: { backLink } } : path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [policyId, getAppUrl, backLink]);
  const clickHandler = useNavigateByRouterEventHandler(toRoutePath);

  if (!policyId || missingPolicies[policyId]) {
    return (
      <span className={otherProps.className} data-test-subj={otherProps['data-test-subj']}>
        {children}
        {
          <EuiText color="subdued" size="xs" className="eui-textNoWrap">
            <EuiIcon size="m" type="alert" color="warning" />
            &nbsp;
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyNotFound"
              defaultMessage="Policy not found!"
            />
          </EuiText>
        }
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
