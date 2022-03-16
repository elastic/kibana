/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import * as i18n from '../translations';
import { LinkAnchor } from '../../links';
import { ActionsNavigation } from '../types';

interface EndpointInfo {
  endpointId: string;
  hostname: string;
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

  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      if (onClick) onClick(endpoints[0].endpointId, ev);
    },
    [onClick, endpoints]
  );

  return (
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
