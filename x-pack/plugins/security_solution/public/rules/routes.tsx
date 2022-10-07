/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import { Redirect, Switch } from 'react-router-dom';

import { Route } from '@kbn/kibana-react-plugin/public';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
// import * as i18n from './translations';
import { RULES_PATH, SecurityPageName } from '../../common/constants';
import { NotFoundPage } from '../app/404';
// import { useReadonlyHeader } from '../use_readonly_header';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';

const EditRulePageLazy: React.FC = lazy(
  () => import('../detections/pages/detection_engine/rules/edit')
);
const RuleDetailsPageLazy: React.FC = lazy(
  () => import('../detections/pages/detection_engine/rules/details')
);
const CreateRulePageLazy: React.FC = lazy(
  () => import('../detections/pages/detection_engine/rules/create')
);
const RulesPageLazy: React.FC = lazy(() => import('../detections/pages/detection_engine/rules'));

enum RuleDetailTabs {
  alerts = 'alerts',
  exceptions = 'rule_exceptions',
  endpointExceptions = 'endpoint_exceptions',
  executionResults = 'execution_results',
  executionEvents = 'execution_events',
}

const RulesSubRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    main: EditRulePageLazy,
    exact: true,
  },
  {
    path: `/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts}|${RuleDetailTabs.exceptions}|${RuleDetailTabs.endpointExceptions}|${RuleDetailTabs.executionResults}|${RuleDetailTabs.executionEvents})`,
    main: RuleDetailsPageLazy,
    exact: true,
  },
  {
    path: '/rules/create',
    main: CreateRulePageLazy,
    exact: true,
  },
  {
    path: '/rules',
    main: RulesPageLazy,
    exact: true,
  },
];

const RulesContainerComponent: React.FC = () => {
  // useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId={SecurityPageName.rules}>
        <Switch>
          <Route // Redirect to first tab if none specified
            path="/rules/id/:detailName"
            exact
            render={({
              match: {
                params: { detailName },
              },
              location,
            }) => (
              <Redirect
                to={{
                  ...location,
                  pathname: `/rules/id/${detailName}/${RuleDetailTabs.alerts}`,
                  search: location.search,
                }}
              />
            )}
          />
          {RulesSubRoutes.map((route) => (
            <Route
              key={`rules-route-${route.path}`}
              path={route.path}
              exact={route?.exact ?? false}
            >
              <Suspense fallback={<EuiLoadingSpinner />}>
                <route.main />
              </Suspense>
            </Route>
          ))}
          <Route component={NotFoundPage} />
          <SpyRoute pageName={SecurityPageName.rules} />
        </Switch>
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

const Rules = React.memo(RulesContainerComponent);

const renderRulesRoutes = () => <Rules />;

export const routes = [
  {
    path: RULES_PATH,
    render: renderRulesRoutes,
  },
];
