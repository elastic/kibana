/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { ReactRouterEuiLink } from './react_router_helpers';

interface DetailPageLinkProps {
  /**
   * MonitorId to be used to redirect to detail page
   */
  monitorId: string;
  /**
   * Link parameters usually filter states
   */
  linkParameters: string | undefined;
}

export const MonitorPageLink: FC<DetailPageLinkProps> = ({
  children,
  monitorId,
  linkParameters,
}) => {
  const getLocationTo = () => {
    // encode monitorId param as 64 base string to make it a valid URL, since it can be a url
    return linkParameters
      ? `/monitor/${btoa(monitorId)}/${linkParameters}`
      : `/monitor/${btoa(monitorId)}`;
  };

  return (
    <ReactRouterEuiLink data-test-subj={`monitor-page-link-${monitorId}`} to={getLocationTo()}>
      {children}
    </ReactRouterEuiLink>
  );
};
