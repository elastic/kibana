/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import * as i18n from './translations';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { EXCEPTIONS_PATH, SecurityPageName } from '../../common/constants';
import { ExceptionListsTable } from '../detections/pages/detection_engine/rules/all/exceptions/exceptions_table';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { NotFoundPage } from '../app/404';
import { useReadonlyHeader } from '../use_readonly_header';

const ExceptionsRoutes = () => {
  return (
    <TrackApplicationView viewId={SecurityPageName.exceptions}>
      <ExceptionListsTable />
      <SpyRoute pageName={SecurityPageName.exceptions} />
    </TrackApplicationView>
  );
};

const ExceptionsContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

  return (
    <Switch>
      <Route path={EXCEPTIONS_PATH} exact component={ExceptionsRoutes} />
      <Route component={NotFoundPage} />
    </Switch>
  );
};

const Exceptions = React.memo(ExceptionsContainerComponent);

const renderExceptionsRoutes = () => <Exceptions />;

export const routes = [
  {
    path: EXCEPTIONS_PATH,
    render: renderExceptionsRoutes,
  },
];
