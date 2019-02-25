/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLocation } from 'history';
import React from 'react';
import { matchPath } from 'react-router-dom';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { RedirectToLogs } from './redirect_to_logs';

describe('RedirectToLogs component', () => {
  it('renders a redirect with the correct position', () => {
    const component = shallowWithIntl(
      <RedirectToLogs {...createRouteComponentProps('/logs?time=1550671089404')} />
    ).dive();
    const withSourceChildFunction = component.prop('children') as any;

    expect(withSourceChildFunction(testSourceChildArgs)).toMatchInlineSnapshot(`
<Redirect
  push={false}
  to="/logs?logFilter=(expression:'',kind:kuery)&logPosition=(position:(tiebreaker:0,time:1550671089404))"
/>
`);
  });

  it('renders a redirect with the correct user-defined filter', () => {
    const component = shallowWithIntl(
      <RedirectToLogs
        {...createRouteComponentProps('/logs?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE')}
      />
    ).dive();
    const withSourceChildFunction = component.prop('children') as any;

    expect(withSourceChildFunction(testSourceChildArgs)).toMatchInlineSnapshot(`
<Redirect
  push={false}
  to="/logs?logFilter=(expression:'FILTER_FIELD:FILTER_VALUE',kind:kuery)&logPosition=(position:(tiebreaker:0,time:1550671089404))"
/>
`);
  });
});

const testSourceChildArgs = {
  configuration: {
    fields: {
      container: 'CONTAINER_FIELD',
      host: 'HOST_FIELD',
      pod: 'POD_FIELD',
    },
  },
  isLoading: false,
};

const createRouteComponentProps = (path: string) => {
  const location = createLocation(path);
  return {
    match: matchPath(location.pathname, { path: '/logs' }) as any,
    history: null as any,
    location,
  };
};
