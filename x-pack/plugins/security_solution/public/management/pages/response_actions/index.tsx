/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Redirect, Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import React, { memo } from 'react';
import { ENDPOINTS_PATH, SecurityPageName } from '../../../../common/constants';
import { useLinkExists } from '../../../common/links';
import { MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { ResponseActionsListPage } from './view/response_actions_list_page';

export const ResponseActionsContainer = memo(() => {
  const canAccessResponseActionsHistoryNavLink = useLinkExists(
    SecurityPageName.responseActionsHistory
  );

  if (!canAccessResponseActionsHistoryNavLink) {
    return <Redirect to={ENDPOINTS_PATH} />;
  }

  return (
    <Switch>
      <Route
        path={MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH}
        exact
        component={ResponseActionsListPage}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ResponseActionsContainer.displayName = 'ResponseActionsContainer';
