/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';

export const EndpointListNavLink = memo<{
  name: string;
  href: string;
  route: string;
  dataTestSubj: string;
}>(({ name, href, route, dataTestSubj }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj={dataTestSubj}
      className="eui-displayInline eui-textTruncate"
      href={href}
      onClick={clickHandler}
    >
      {name}
    </EuiLink>
  );
});
EndpointListNavLink.displayName = 'EndpointListNavLink';
