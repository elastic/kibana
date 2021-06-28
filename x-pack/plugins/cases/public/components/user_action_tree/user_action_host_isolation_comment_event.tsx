/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import * as i18n from './translations';
import { LinkAnchor } from '../links';
import { useKibana } from '../../common/lib/kibana';
import { SECURITY_SOLUTION_APP_ID } from './constants';

interface EndpointInfo {
  endpointId: string;
  hostname: string;
}

interface Props {
  type: string;
  endpoints: EndpointInfo[];
}

const HostIsolationCommentEventComponent: React.FC<Props> = ({ type, endpoints }) => {
  const activityLogPath = `/administration/endpoints?selected_endpoint=${endpoints[0].endpointId}&show=activity_log`;
  const { getUrlForApp, navigateToUrl } = useKibana().services.application;

  const endpointDetailsHref = getUrlForApp(SECURITY_SOLUTION_APP_ID, {
    path: activityLogPath,
  });

  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      return navigateToUrl(endpointDetailsHref);
    },
    [endpointDetailsHref, navigateToUrl]
  );

  return (
    <>
      {type === 'isolate' ? `${i18n.ISOLATED_HOST} ` : `${i18n.RELEASED_HOST} `}
      <LinkAnchor
        onClick={onLinkClick}
        href={endpointDetailsHref}
        data-test-subj={`endpointDetails-activity-log-link-${endpoints[0].endpointId}`}
      >
        {endpoints[0].hostname}
      </LinkAnchor>
      {endpoints.length > 1 && i18n.OTHER_ENDPOINTS(endpoints.length - 1)}
    </>
  );
};

export const HostIsolationCommentEvent = memo(HostIsolationCommentEventComponent);
