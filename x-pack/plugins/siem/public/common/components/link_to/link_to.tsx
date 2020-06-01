/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';

import { SiemPageName } from '../../../app/types';
import { HostsTableType } from '../../../hosts/store/model';
import {
  RedirectToCreateRulePage,
  RedirectToDetectionEnginePage,
  RedirectToEditRulePage,
  RedirectToRuleDetailsPage,
  RedirectToRulesPage,
} from './redirect_to_detection_engine';
import { RedirectToHostsPage, RedirectToHostDetailsPage } from './redirect_to_hosts';
import { RedirectToNetworkPage } from './redirect_to_network';
import { RedirectToOverviewPage } from './redirect_to_overview';
import { RedirectToTimelinesPage } from './redirect_to_timelines';
import {
  RedirectToCasePage,
  RedirectToCreatePage,
  RedirectToConfigureCasesPage,
} from './redirect_to_case';
import { DetectionEngineTab } from '../../../alerts/pages/detection_engine/types';
import { TimelineType } from '../../../../common/types/timeline';
import { RedirectToManagementPage } from './redirect_to_management';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

export const LinkToPage = React.memo<LinkToPageProps>(({ match }) => (
  <Switch>
    <Route
      component={RedirectToOverviewPage}
      path={`${match.url}/:pageName(${SiemPageName.overview})`}
    />
    <Route
      exact
      component={RedirectToCasePage}
      path={`${match.url}/:pageName(${SiemPageName.case})`}
    />
    <Route
      exact
      component={RedirectToCreatePage}
      path={`${match.url}/:pageName(${SiemPageName.case})/create`}
    />
    <Route
      exact
      component={RedirectToConfigureCasesPage}
      path={`${match.url}/:pageName(${SiemPageName.case})/configure`}
    />
    <Route
      component={RedirectToCasePage}
      path={`${match.url}/:pageName(${SiemPageName.case})/:detailName`}
    />
    <Route
      component={RedirectToHostsPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.hosts})`}
    />
    <Route
      component={RedirectToHostsPage}
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:tabName(${HostsTableType.hosts}|${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events}|${HostsTableType.alerts})`}
    />
    <Route
      component={RedirectToHostDetailsPage}
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:detailName/:tabName(${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events}|${HostsTableType.alerts})`}
    />
    <Route
      component={RedirectToHostDetailsPage}
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:detailName`}
    />
    <Route
      component={RedirectToNetworkPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.network})`}
    />
    <Route
      component={RedirectToNetworkPage}
      path={`${match.url}/:pageName(${SiemPageName.network})/ip/:detailName/:flowTarget`}
    />
    <Route
      component={RedirectToDetectionEnginePage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detections})`}
    />
    <Route
      component={RedirectToDetectionEnginePage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detections})/:tabName(${DetectionEngineTab.alerts}|${DetectionEngineTab.signals})`}
    />
    <Route
      component={RedirectToRulesPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detections})/rules`}
    />
    <Route
      component={RedirectToCreateRulePage}
      path={`${match.url}/:pageName(${SiemPageName.detections})/rules/create`}
    />
    <Route
      component={RedirectToRuleDetailsPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detections})/rules/id/:detailName`}
    />
    <Route
      component={RedirectToEditRulePage}
      path={`${match.url}/:pageName(${SiemPageName.detections})/rules/id/:detailName/edit`}
    />
    <Route
      component={RedirectToTimelinesPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.timelines})`}
    />
    <Route
      component={RedirectToTimelinesPage}
      path={`${match.url}/:pageName(${SiemPageName.timelines})/:tabName(${TimelineType.default}|${TimelineType.template})`}
    />
    <Route
      component={RedirectToManagementPage}
      path={`${match.url}/:pageName(${SiemPageName.management})`}
    />
    <Redirect to="/" />
  </Switch>
));

LinkToPage.displayName = 'LinkToPage';
