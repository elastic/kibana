/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from '../translations';
import { LinkAnchor } from '../../links';
import type { ActionsNavigation } from '../types';

interface EndpointInfo {
  endpointId: string;
  hostname: string;
  type?: string;
}

interface Props {
  type: string;
  endpoints: EndpointInfo[];
  href?: ActionsNavigation['href'];
  onClick?: ActionsNavigation['onClick'];
}

const HostIsolationCommentEventComponent: React.FC<Props> = ({
  type,
  endpoints,
  href,
  onClick,
}) => {
  const endpointDetailsHref = href ? href(endpoints[0].endpointId) : '';
  const getUrlForApp = useKibana().services.application.getUrlForApp;

  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      if (onClick) onClick(endpoints[0].endpointId, ev);
    },
    [onClick, endpoints]
  );

  const hostsDetailsHref = getUrlForApp('security', {
    path: `/hosts/name/${endpoints[0].hostname}`,
  });

  return endpoints[0]?.type === 'sentinel_one' ? (
    <>
      {type === 'isolate' ? `${i18n.ISOLATED_HOST} ` : `${i18n.RELEASED_HOST} `}
      <LinkAnchor
        // onClick={onLinkClick}
        href={hostsDetailsHref}
        data-test-subj={`actions-link-${endpoints[0].endpointId}`}
      >
        {endpoints[0].hostname}
      </LinkAnchor>
    </>
  ) : (
    <>
      {type === 'isolate' ? `${i18n.ISOLATED_HOST} ` : `${i18n.RELEASED_HOST} `}
      <LinkAnchor
        onClick={onLinkClick}
        href={endpointDetailsHref}
        data-test-subj={`actions-link-${endpoints[0].endpointId}`}
      >
        {endpoints[0].hostname}
      </LinkAnchor>
      {endpoints.length > 1 && i18n.OTHER_ENDPOINTS(endpoints.length - 1)}
    </>
  );
};
HostIsolationCommentEventComponent.displayName = 'HostIsolationCommentEvent';

export const HostIsolationCommentEvent = memo(HostIsolationCommentEventComponent);
