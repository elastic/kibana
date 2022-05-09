/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider, KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';
import { useLogView } from '../../hooks/use_log_view';
import {
  createLoadedUseLogViewMock,
  createLoadingUseLogViewMock,
} from '../../hooks/use_log_view.mock';
import { LinkToLogsPage } from './link_to_logs';

jest.mock('../../hooks/use_log_view');
const useLogViewMock = useLogView as jest.MockedFunction<typeof useLogView>;

const renderRoutes = (routes: React.ReactElement) => {
  const history = createMemoryHistory();
  const services = {
    http: httpServiceMock.createStartContract(),
    logViews: {
      client: {},
    },
    observability: {
      navigation: {
        PageTemplate: KibanaPageTemplate,
      },
    },
  };
  const renderResult = render(
    <KibanaContextProvider services={services}>
      <Router history={history}>{routes}</Router>
    </KibanaContextProvider>
  );

  return {
    ...renderResult,
    history,
    services,
  };
};

describe('LinkToLogsPage component', () => {
  beforeEach(async () => {
    useLogViewMock.mockImplementation(await createLoadedUseLogViewMock());
  });

  afterEach(() => {
    useLogViewMock.mockRestore();
  });

  describe('default route', () => {
    it('redirects to the stream at a given time filtered for a user-defined criterion', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'FILTER_FIELD:FILTER_VALUE')"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('redirects to the stream using a specific source id', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/OTHER_SOURCE');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('OTHER_SOURCE');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(`"(language:kuery,query:'')"`);
      expect(searchParams.get('logPosition')).toEqual(null);
    });
  });

  describe('logs route', () => {
    it('redirects to the stream at a given time filtered for a user-defined criterion', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/logs?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'FILTER_FIELD:FILTER_VALUE')"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('redirects to the stream using a specific source id', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/OTHER_SOURCE/logs');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('OTHER_SOURCE');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(`"(language:kuery,query:'')"`);
      expect(searchParams.get('logPosition')).toEqual(null);
    });
  });

  describe('host-logs route', () => {
    it('redirects to the stream filtered for a host', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/host-logs/HOST_NAME');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'host.name: HOST_NAME')"`
      );
      expect(searchParams.get('logPosition')).toEqual(null);
    });

    it('redirects to the stream at a given time filtered for a host and a user-defined criterion', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push(
        '/link-to/host-logs/HOST_NAME?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE'
      );

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'(host.name: HOST_NAME) and (FILTER_FIELD:FILTER_VALUE)')"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('redirects to the stream filtered for a host using a specific source id', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/OTHER_SOURCE/host-logs/HOST_NAME');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('OTHER_SOURCE');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'host.name: HOST_NAME')"`
      );
      expect(searchParams.get('logPosition')).toEqual(null);
    });

    it('renders a loading page while loading the source configuration', async () => {
      useLogViewMock.mockImplementation(createLoadingUseLogViewMock());

      const { history, queryByTestId } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/host-logs/HOST_NAME');
      await waitFor(() => {
        expect(queryByTestId('nodeLoadingPage-host')).not.toBeEmptyDOMElement();
      });
    });
  });

  describe('container-logs route', () => {
    it('redirects to the stream filtered for a container', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/container-logs/CONTAINER_ID');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'container.id: CONTAINER_ID')"`
      );
      expect(searchParams.get('logPosition')).toEqual(null);
    });

    it('redirects to the stream at a given time filtered for a container and a user-defined criterion', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push(
        '/link-to/container-logs/CONTAINER_ID?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE'
      );

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'(container.id: CONTAINER_ID) and (FILTER_FIELD:FILTER_VALUE)')"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('renders a loading page while loading the source configuration', () => {
      useLogViewMock.mockImplementation(createLoadingUseLogViewMock());

      const { history, queryByTestId } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/container-logs/CONTAINER_ID');

      expect(queryByTestId('nodeLoadingPage-container')).not.toBeEmptyDOMElement();
    });
  });

  describe('pod-logs route', () => {
    it('redirects to the stream filtered for a pod', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/pod-logs/POD_UID');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'kubernetes.pod.uid: POD_UID')"`
      );
      expect(searchParams.get('logPosition')).toEqual(null);
    });

    it('redirects to the stream at a given time filtered for a pod and a user-defined criterion', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/pod-logs/POD_UID?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE');

      expect(history.location.pathname).toEqual('/stream');

      const searchParams = new URLSearchParams(history.location.search);
      expect(searchParams.get('sourceId')).toEqual('default');
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(
        `"(language:kuery,query:'(kubernetes.pod.uid: POD_UID) and (FILTER_FIELD:FILTER_VALUE)')"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('renders a loading page while loading the source configuration', () => {
      useLogViewMock.mockImplementation(createLoadingUseLogViewMock());

      const { history, queryByTestId } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/pod-logs/POD_UID');

      expect(queryByTestId('nodeLoadingPage-pod')).not.toBeEmptyDOMElement();
    });
  });
});
