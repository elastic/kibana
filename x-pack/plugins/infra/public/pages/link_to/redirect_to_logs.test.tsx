/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLocation } from 'history';
import React from 'react';
import { matchPath } from 'react-router-dom';
import { shallow } from 'enzyme';

import { RedirectToLogs } from './redirect_to_logs';

describe('RedirectToLogs component', () => {
  it('renders a redirect with the correct position', () => {
    const component = shallow(
      <RedirectToLogs {...createRouteComponentProps('/logs?time=1550671089404')} />
    );

    expect(component).toMatchInlineSnapshot(`
      <Redirect
        to="/stream?logView=(logViewId:default,type:log-view-reference)&logPosition=(position:(tiebreaker:0,time:1550671089404))&logFilter=(query:(language:kuery,query:''),refreshInterval:(pause:!t,value:5000),timeRange:(from:'2019-02-20T12:58:09.404Z',to:'2019-02-20T14:58:09.404Z'))"
      />
    `);
  });

  it('renders a redirect with the correct user-defined filter', () => {
    const component = shallow(
      <RedirectToLogs
        {...createRouteComponentProps('/logs?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE')}
      />
    );

    expect(component).toMatchInlineSnapshot(`
      <Redirect
        to="/stream?logView=(logViewId:default,type:log-view-reference)&logPosition=(position:(tiebreaker:0,time:1550671089404))&logFilter=(query:(language:kuery,query:'FILTER_FIELD:FILTER_VALUE'),refreshInterval:(pause:!t,value:5000),timeRange:(from:'2019-02-20T12:58:09.404Z',to:'2019-02-20T14:58:09.404Z'))"
      />
    `);
  });

  it('renders a redirect with the correct custom source id', () => {
    const component = shallow(
      <RedirectToLogs {...createRouteComponentProps('/SOME-OTHER-SOURCE/logs')} />
    );

    expect(component).toMatchInlineSnapshot(`
      <Redirect
        to="/stream?logView=(logViewId:default,type:log-view-reference)&logFilter=(query:(language:kuery,query:''),refreshInterval:(pause:!t,value:5000))"
      />
    `);
  });
});

const createRouteComponentProps = (path: string) => {
  const location = createLocation(path);
  return {
    match: matchPath(location.pathname, { path: '/:sourceId?/logs' }) as any,
    history: null as any,
    location,
  };
};
