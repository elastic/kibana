/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import * as i18n from './translations';
import { EXCEPTIONS_PATH, SecurityPageName } from '../../common/constants';
import { ExceptionListsTable } from '../detection_engine/rule_exceptions_ui/pages/exceptions/exceptions_table';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { NotFoundPage } from '../app/404';
import { useReadonlyHeader } from '../use_readonly_header';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const ExceptionsRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.exceptions}>
      <ExceptionListsTable />
      <SpyRoute pageName={SecurityPageName.exceptions} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

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
