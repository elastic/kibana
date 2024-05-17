/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import React, { memo } from 'react';
import { NotFoundPage } from '../../../app/404';
import { SecurityPageName } from '../../../app/types';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { MANAGEMENT_ROUTING_BLOCKLIST_PATH } from '../../common/constants';
import { Blocklist } from './view/blocklist';

/**
 * Provides the routing container for the blocklist related views
 */
export const BlocklistContainer = memo(() => {
  return (
    <TrackApplicationView viewId={SecurityPageName.blocklist}>
      <Routes>
        <Route path={MANAGEMENT_ROUTING_BLOCKLIST_PATH} exact component={Blocklist} />
        <Route path="*" component={NotFoundPage} />
      </Routes>
      <SpyRoute pageName={SecurityPageName.blocklist} />
    </TrackApplicationView>
  );
});

BlocklistContainer.displayName = 'BlocklistContainer';
