/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { CoreStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
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

  const EditRedirect = () => {
    const params = useParams<{ id: string }>();
    return <Navigate to={`/pipeline/${params.id}/edit`} />;
  };

  const Edit = () => {
    const params = useParams<{ id: string }>();
    return (
      <PipelineEditView
        history={history}
        setBreadcrumbs={setBreadcrumbs}
        logstashLicenseService={logstashLicenseService}
        pipelineService={pipelineService}
        toasts={core.notifications.toasts}
        id={params.id}
      />
    );
  };

  const App = () => {
    return (
      <core.i18n.Context>
        <KibanaThemeProvider theme$={theme$}>
          <Router navigator={history} location={history.location}>
            <Routes>
              {['/', ''].map((path) => (
                <Route
                  path={path}
                  children={() => {
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
              ))}

              <Route
                path="/pipeline/new-pipeline"
                children={
                  <PipelineEditView
                    history={history}
                    setBreadcrumbs={setBreadcrumbs}
                    logstashLicenseService={logstashLicenseService}
                    pipelineService={pipelineService}
                    toasts={core.notifications.toasts}
                  />
                }
              />
              <Route path="/pipeline/:id" element={EditRedirect} />
              <Route path="/pipeline/:id/edit" element={Edit} />
            </Routes>
          </Router>
        </KibanaThemeProvider>
      </core.i18n.Context>
    );
  };

  ReactDOM.render(<App />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
