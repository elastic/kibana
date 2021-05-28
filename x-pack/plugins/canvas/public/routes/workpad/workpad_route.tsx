/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { Route, Switch, Redirect, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { WorkpadApp } from '../../components/workpad_app';
import { ExportApp } from '../../components/export_app';
import { CanvasLoading } from '../../components/canvas_loading';
// @ts-expect-error
import { fetchAllRenderables } from '../../state/actions/elements';
import { useServices } from '../../services';
import { CanvasWorkpad } from '../../../types';
import { ErrorStrings } from '../../../i18n';
import { useWorkpad } from './hooks/use_workpad';
import { useRestoreHistory } from './hooks/use_restore_history';
import { useWorkpadHistory } from './hooks/use_workpad_history';
import { usePageSync } from './hooks/use_page_sync';
import { WorkpadPageRouteProps, WorkpadRouteProps, WorkpadPageRouteParams } from '.';
import { WorkpadRoutingContextComponent } from './workpad_routing_context';
import { WorkpadPresentationHelper } from './workpad_presentation_helper';

const { workpadRoutes: strings } = ErrorStrings;

export const WorkpadRoute = () => (
  <Route
    path={'/workpad/:id'}
    exact={false}
    children={(route: WorkpadRouteProps) => (
      <WorkpadLoaderComponent params={route.match.params} key="workpad-loader">
        {(workpad: CanvasWorkpad) => (
          <Switch>
            <Route
              path="/workpad/:id/page/:pageNumber"
              children={(pageRoute) => (
                <WorkpadHistoryManager>
                  <WorkpadRoutingContextComponent>
                    <WorkpadPresentationHelper>
                      <WorkpadApp />
                    </WorkpadPresentationHelper>
                  </WorkpadRoutingContextComponent>
                </WorkpadHistoryManager>
              )}
            />
            <Route path="/workpad/:id" strict={false} exact={true}>
              <Redirect to={`/workpad/${route.match.params.id}/page/${workpad.page + 1}`} />
            </Route>
          </Switch>
        )}
      </WorkpadLoaderComponent>
    )}
  />
);

export const ExportWorkpadRoute = () => (
  <Route
    path={'/export/workpad/pdf/:id/page/:pageNumber'}
    children={(route: WorkpadPageRouteProps) => (
      <WorkpadLoaderComponent loadPages={false} params={route.match.params}>
        {() => (
          <ExportRouteManager>
            <ExportApp />
          </ExportRouteManager>
        )}
      </WorkpadLoaderComponent>
    )}
  />
);

export const ExportRouteManager: FC = ({ children }) => {
  const params = useParams<WorkpadPageRouteParams>();
  usePageSync();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAllRenderables({ onlyActivePage: true }));
  }, [dispatch, params.pageNumber]);

  return <>{children}</>;
};

export const WorkpadHistoryManager: FC = ({ children }) => {
  useRestoreHistory();
  useWorkpadHistory();
  usePageSync();

  return <>{children}</>;
};

const WorkpadLoaderComponent: FC<{
  params: WorkpadRouteProps['match']['params'];
  loadPages?: boolean;
  children: (workpad: CanvasWorkpad) => JSX.Element;
}> = ({ params, children, loadPages }) => {
  const [workpad, error] = useWorkpad(params.id, loadPages);
  const services = useServices();

  useEffect(() => {
    if (error) {
      services.notify.error(error, { title: strings.getLoadFailureErrorMessage() });
    }
  }, [error, services.notify]);

  if (error) {
    return <Redirect to="/" />;
  }

  if (!workpad) {
    return <CanvasLoading />;
  }

  return children(workpad);
};
