/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Switch, Redirect } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import React, { memo } from 'react';
import { ENDPOINTS_PATH, SecurityPageName } from '../../../../common/constants';
import { useLinkExists } from '../../../common/links/links';
import { MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { HostIsolationExceptionsList } from './view/host_isolation_exceptions_list';

/**
 * Provides the routing container for the hosts related views
 */
export const HostIsolationExceptionsContainer = memo(() => {
  // TODO: Probably should not silently redirect here
  const canAccessHostIsolationExceptionsLink = useLinkExists(
    SecurityPageName.hostIsolationExceptions
  );

  if (!canAccessHostIsolationExceptionsLink) {
    return <Redirect to={ENDPOINTS_PATH} />;
  }

  return (
    <Switch>
      <Route
        path={MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH}
        exact
        component={HostIsolationExceptionsList}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

HostIsolationExceptionsContainer.displayName = 'HostIsolationExceptionsContainer';
