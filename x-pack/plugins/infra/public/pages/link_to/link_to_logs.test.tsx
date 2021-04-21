/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { httpServiceMock } from 'src/core/public/mocks';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { useLogSource } from '../../containers/logs/log_source';
import {
  createLoadedUseLogSourceMock,
  createLoadingUseLogSourceMock,
} from '../../containers/logs/log_source/log_source.mock';
import { LinkToLogsPage } from './link_to_logs';

jest.mock('../../containers/logs/log_source');
const useLogSourceMock = useLogSource as jest.MockedFunction<typeof useLogSource>;

const renderRoutes = (routes: React.ReactElement) => {
  const history = createMemoryHistory();
  const services = {
    http: httpServiceMock.createStartContract(),
    data: {
      indexPatterns: {},
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
  beforeEach(() => {
    useLogSourceMock.mockImplementation(createLoadedUseLogSourceMock());
  });

  afterEach(() => {
    useLogSourceMock.mockRestore();
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
        `"(expression:'FILTER_FIELD:FILTER_VALUE',kind:kuery)"`
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
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(`"(expression:'',kind:kuery)"`);
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
        `"(expression:'FILTER_FIELD:FILTER_VALUE',kind:kuery)"`
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
      expect(searchParams.get('logFilter')).toMatchInlineSnapshot(`"(expression:'',kind:kuery)"`);
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
        `"(expression:'HOST_FIELD: HOST_NAME',kind:kuery)"`
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
        `"(expression:'(HOST_FIELD: HOST_NAME) and (FILTER_FIELD:FILTER_VALUE)',kind:kuery)"`
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
        `"(expression:'HOST_FIELD: HOST_NAME',kind:kuery)"`
      );
      expect(searchParams.get('logPosition')).toEqual(null);
    });

    it('renders a loading page while loading the source configuration', () => {
      useLogSourceMock.mockImplementation(createLoadingUseLogSourceMock());

      const { history, queryByTestId } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/host-logs/HOST_NAME');

      expect(queryByTestId('nodeLoadingPage-host')).not.toBeEmpty();
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
        `"(expression:'CONTAINER_FIELD: CONTAINER_ID',kind:kuery)"`
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
        `"(expression:'(CONTAINER_FIELD: CONTAINER_ID) and (FILTER_FIELD:FILTER_VALUE)',kind:kuery)"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('renders a loading page while loading the source configuration', () => {
      useLogSourceMock.mockImplementation(createLoadingUseLogSourceMock());

      const { history, queryByTestId } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/container-logs/CONTAINER_ID');

      expect(queryByTestId('nodeLoadingPage-container')).not.toBeEmpty();
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
        `"(expression:'POD_FIELD: POD_UID',kind:kuery)"`
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
        `"(expression:'(POD_FIELD: POD_UID) and (FILTER_FIELD:FILTER_VALUE)',kind:kuery)"`
      );
      expect(searchParams.get('logPosition')).toMatchInlineSnapshot(
        `"(end:'2019-02-20T14:58:09.404Z',position:(tiebreaker:0,time:1550671089404),start:'2019-02-20T12:58:09.404Z',streamLive:!f)"`
      );
    });

    it('renders a loading page while loading the source configuration', () => {
      useLogSourceMock.mockImplementation(createLoadingUseLogSourceMock());

      const { history, queryByTestId } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={LinkToLogsPage} />
        </Switch>
      );

      history.push('/link-to/pod-logs/POD_UID');

      expect(queryByTestId('nodeLoadingPage-pod')).not.toBeEmpty();
    });
  });
});
