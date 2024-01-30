/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { generatePath } from 'react-router-dom';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';

import { LinkAnchor } from '../../links';
import * as i18n from '../translations';
import { useKibana, useNavigation } from '../../../common/lib/kibana';

interface EndpointInfo {
  endpointId: string;
  hostname: string;
  type?: string;
}

interface Props {
  type: string;
  endpoints: EndpointInfo[];
}

import { isEmpty } from 'lodash/fp';

export const appendSearch = (search?: string) =>
  isEmpty(search) ? '' : `${search?.startsWith('?') ? search : `?${search}`}`;

const getDetails = (queryParams: { selected_endpoint: string; show: string }): string => {
  const urlQueryParams = querystring.stringify(queryParams);

  return `${generatePath('/administration/:tabName(endpoints)', {
    tabName: 'endpoints',
  })}${appendSearch(urlQueryParams)}`;
};

const HostIsolationCommentEventComponent: React.FC<Props> = ({ type, endpoints }) => {
  const { getAppUrl, navigateTo } = useNavigation('security');

  const endpointDetailsHref = getAppUrl({
    path: getDetails({
      selected_endpoint: endpoints[0].endpointId,
      show: 'activity_log',
    }),
  });
  const getUrlForApp = useKibana().services.application.getUrlForApp;

  const hostsDetailsHref = getUrlForApp('security', {
    path: `/hosts/name/${endpoints[0].hostname}`,
  });

  const actionText = type === 'isolate' ? `${i18n.ISOLATED_HOST} ` : `${i18n.RELEASED_HOST} `;

  const linkHref = endpoints[0]?.type === 'sentinel_one' ? hostsDetailsHref : endpointDetailsHref;

  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      return navigateTo({ url: linkHref });
    },
    [navigateTo, linkHref]
  );

  return (
    <>
      {actionText}
      <LinkAnchor
        onClick={onLinkClick}
        href={linkHref}
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
