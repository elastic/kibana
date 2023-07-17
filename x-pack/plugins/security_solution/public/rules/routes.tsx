/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import * as i18n from './translations';
import { RULES_LANDING_PATH, RULES_PATH, SecurityPageName } from '../../common/constants';
import { NotFoundPage } from '../app/404';
import { useReadonlyHeader } from '../use_readonly_header';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import type { SecuritySubPluginRoutes } from '../app/types';
import { RulesLandingPage } from './landing';
import { RuleDetailTabs } from '../detection_engine/rule_details_ui/pages/rule_details/rule_detail_tabs';
import { AllRulesTabs } from '../detection_engine/rule_management_ui/components/rules_table/all_rules_tabs';

const EditRulePageLazy = React.lazy(() => import('./routes/edit_rule_page'));

const CreateRulePageLazy = React.lazy(() => import('./routes/create_rule_page'));

const RulesPageLazy = React.lazy(() => import('./routes/rules_page'));

const AddRulesPageLazy = React.lazy(() => import('./routes/add_rules_page'));

const RulesSubRoutes = [
  {
    path: '/rules/id/:detailName/edit',
    component: EditRulePageLazy,
    exact: true,
  },
  {
    path: `/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts}|${RuleDetailTabs.exceptions}|${RuleDetailTabs.endpointExceptions}|${RuleDetailTabs.executionResults}|${RuleDetailTabs.executionEvents})`,
    component: EditRulePageLazy,
    exact: true,
  },
  {
    path: '/rules/create',
    component: CreateRulePageLazy,
    exact: true,
  },
  {
    path: `/rules/:tabName(${AllRulesTabs.management}|${AllRulesTabs.monitoring}|${AllRulesTabs.updates})`,
    component: RulesPageLazy,
    exact: true,
  },
  {
    path: '/rules/add_rules',
    component: AddRulesPageLazy,
    exact: true,
  },
];

const RulesContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId={SecurityPageName.rules}>
        <Routes>
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
          <Route path="/rules" exact>
            <Redirect to={`/rules/${AllRulesTabs.management}`} />
          </Route>
          {RulesSubRoutes.map((route) => (
            <Route
              key={`rules-route-${route.path}`}
              path={route.path}
              exact={route?.exact ?? false}
              component={route.component}
            />
          ))}
          <Route component={NotFoundPage} />
          <SpyRoute pageName={SecurityPageName.rules} />
        </Routes>
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

const Rules = React.memo(RulesContainerComponent);

export const routes: SecuritySubPluginRoutes = [
  {
    path: RULES_LANDING_PATH,
    component: RulesLandingPage,
  },
  {
    path: RULES_PATH,
    component: Rules,
  },
];
