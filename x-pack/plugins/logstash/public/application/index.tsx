/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch, Redirect } from 'react-router-dom';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { CoreStart } from 'src/core/public';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import {
  ClusterService,
  MonitoringService,
  PipelineService,
  PipelinesService,
  // @ts-ignore
} from '../services';
// @ts-ignore
import { PipelineList } from './components/pipeline_list';
import { PipelineEditView } from './pipeline_edit_view';
// @ts-ignore
import { Pipeline } from '../models/pipeline';
// @ts-ignore
import * as Breadcrumbs from './breadcrumbs';

export const renderApp = async (
  core: CoreStart,
  { history, element, setBreadcrumbs, theme$ }: ManagementAppMountParams,
  isMonitoringEnabled: boolean,
  licenseService$: Observable<any>
) => {
  const logstashLicenseService = await licenseService$.pipe(first()).toPromise();
  const clusterService = new ClusterService(core.http);
  const monitoringService = new MonitoringService(core.http, isMonitoringEnabled, clusterService);
  const pipelinesService = new PipelinesService(core.http, monitoringService);
  const pipelineService = new PipelineService(core.http, pipelinesService);

  ReactDOM.render(
    <core.i18n.Context>
      <KibanaThemeProvider theme$={theme$}>
        <Router history={history}>
          <Switch>
            <Route
              path={['/', '']}
              exact
              render={() => {
                setBreadcrumbs(Breadcrumbs.getPipelineListBreadcrumbs());
                return (
                  <PipelineList
                    clusterService={clusterService}
                    isReadOnly={logstashLicenseService.isReadOnly}
                    isForbidden={true}
                    isLoading={false}
                    licenseService={logstashLicenseService}
                    monitoringService={monitoringService}
                    openPipeline={(id: string) => history.push(`/pipeline/${id}/edit`)}
                    clonePipeline={(id: string) => history.push(`/pipeline/${id}/edit?clone`)}
                    createPipeline={() => history.push(`pipeline/new-pipeline`)}
                    pipelinesService={pipelinesService}
                    toastNotifications={core.notifications.toasts}
                  />
                );
              }}
            />
            <Route
              path="/pipeline/new-pipeline"
              exact
              render={() => (
                <PipelineEditView
                  history={history}
                  setBreadcrumbs={setBreadcrumbs}
                  logstashLicenseService={logstashLicenseService}
                  pipelineService={pipelineService}
                  toasts={core.notifications.toasts}
                />
              )}
            />
            <Route
              path="/pipeline/:id"
              exact
              render={({ match }) => <Redirect to={`/pipeline/${match.params.id}/edit`} />}
            />
            <Route
              path="/pipeline/:id/edit"
              exact
              render={({ match }) => (
                <PipelineEditView
                  history={history}
                  setBreadcrumbs={setBreadcrumbs}
                  logstashLicenseService={logstashLicenseService}
                  pipelineService={pipelineService}
                  toasts={core.notifications.toasts}
                  id={match.params.id}
                />
              )}
            />
          </Switch>
        </Router>
      </KibanaThemeProvider>
    </core.i18n.Context>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
