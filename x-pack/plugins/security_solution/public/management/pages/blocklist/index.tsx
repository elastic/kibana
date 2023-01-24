/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import React, { memo } from 'react';
import { MANAGEMENT_ROUTING_BLOCKLIST_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { Blocklist } from './view/blocklist';
import { SecurityPageName } from '../../../app/types';
import { SpyRoute } from '../../../common/utils/route/spy_routes';

/**
 * Provides the routing container for the blocklist related views
 */
export const BlocklistContainer = memo(() => {
  return (
    <>
      <Switch>
        <Route path={MANAGEMENT_ROUTING_BLOCKLIST_PATH} exact component={Blocklist} />
        <Route path="*" component={NotFoundPage} />
      </Switch>
      <SpyRoute pageName={SecurityPageName.blocklist} />
    </>
  );
});

BlocklistContainer.displayName = 'BlocklistContainer';
