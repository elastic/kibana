/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useParams } from 'react-router-dom-v5-compat';
import { useDispatch } from 'react-redux';
import { WorkpadApp } from '../../components/workpad_app';
import { ExportApp } from '../../components/export_app';
import { CanvasLoading } from '../../components/canvas_loading';
// @ts-expect-error
import { fetchAllRenderables } from '../../state/actions/elements';
import { useNotifyService } from '../../services';
import { ErrorStrings } from '../../../i18n';
import { useWorkpad } from './hooks/use_workpad';
import { useRestoreHistory } from './hooks/use_restore_history';
import { useWorkpadHistory } from './hooks/use_workpad_history';
import { usePageSync } from './hooks/use_page_sync';
import { useWorkpadPersist } from './hooks/use_workpad_persist';
import { WorkpadRouteParams } from '.';
import { WorkpadRoutingContextComponent } from './workpad_routing_context';
import { WorkpadPresentationHelper } from './workpad_presentation_helper';

const { workpadRoutes: strings } = ErrorStrings;

export const WorkpadRouteComponent = React.memo(() => {
  const params = useParams<WorkpadRouteParams>();

  const getRedirectPath = useCallback(
    (workpadId: string) =>
      `/workpad/${workpadId}${params.pageNumber ? `/page/${params.pageNumber}` : ''}`,
    [params.pageNumber]
  );

  return (
    <WorkpadLoaderComponent params={params} key="workpad-loader" getRedirectPath={getRedirectPath}>
      <WorkpadHistoryManager>
        <WorkpadRoutingContextComponent>
          <WorkpadPresentationHelper>
            <WorkpadApp />
          </WorkpadPresentationHelper>
        </WorkpadRoutingContextComponent>
      </WorkpadHistoryManager>
    </WorkpadLoaderComponent>
  );
});

// eslint-disable-next-line react/no-multi-comp
export const ExportWorkpadRouteComponent = React.memo(() => {
  const params = useParams<WorkpadRouteParams>();
  const getRedirectPath = useCallback(
    (workpadId: string) => `/export/workpad/pdf/${workpadId}/page/${params.pageNumber}`,
    [params.pageNumber]
  );

  return (
    <WorkpadLoaderComponent loadPages={false} params={params} getRedirectPath={getRedirectPath}>
      <ExportRouteManager>
        <ExportApp />
      </ExportRouteManager>
    </WorkpadLoaderComponent>
  );
});

export const ExportRouteManager: FC = ({ children }) => {
  const params = useParams<WorkpadRouteParams>();
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
  useWorkpadPersist();

  return <>{children}</>;
};

const WorkpadLoaderComponent: FC<{
  params: Readonly<Partial<WorkpadRouteParams>>;
  loadPages?: boolean;
  getRedirectPath: (workpadId: string) => string;
  children: React.ReactElement;
}> = ({ params, children, loadPages, getRedirectPath }) => {
  const history = useHistory();
  const [workpad, error] = useWorkpad(params.id as string, loadPages, getRedirectPath);
  const notifyService = useNotifyService();

  useEffect(() => {
    if (error) {
      notifyService.error(error, { title: strings.getLoadFailureErrorMessage() });
      history.push('/');
    } else if (workpad && !params.pageNumber) {
      history.replace({
        pathname: `/workpad/${params.id}/page/${workpad.page + 1}`,
      });
    }
  }, [error, history, notifyService, params, workpad]);

  if (!workpad) {
    return <CanvasLoading />;
  }

  return children;
};
