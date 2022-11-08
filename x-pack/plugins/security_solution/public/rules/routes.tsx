/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, Switch } from 'react-router-dom';

import { Route } from '@kbn/kibana-react-plugin/public';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import * as i18n from './translations';
import { RULES_PATH, SecurityPageName } from '../../common/constants';
import { NotFoundPage } from '../app/404';
import { RulesPage } from '../detection_engine/rule_management_ui/pages/rule_management';
import { CreateRulePage } from '../detection_engine/rule_creation_ui/pages/rule_creation';
import {
  RuleDetailsPage,
  RuleDetailTabs,
} from '../detection_engine/rule_details_ui/pages/rule_details';
import { EditRulePage } from '../detection_engine/rule_creation_ui/pages/rule_editing';
import { useReadonlyHeader } from '../use_readonly_header';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';

const RulesSubRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    main: EditRulePage,
    exact: true,
  },
  {
    path: `/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts}|${RuleDetailTabs.exceptions}|${RuleDetailTabs.endpointExceptions}|${RuleDetailTabs.executionResults}|${RuleDetailTabs.executionEvents})`,
    main: RuleDetailsPage,
    exact: true,
  },
  {
    path: '/rules/create',
    main: CreateRulePage,
    exact: true,
  },
  {
    path: '/rules',
    main: RulesPage,
    exact: true,
  },
];

const RulesContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

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
              <route.main />
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
