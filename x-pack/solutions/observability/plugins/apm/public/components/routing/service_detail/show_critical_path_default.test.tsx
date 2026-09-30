/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Location } from 'history';
import { createMemoryHistory } from 'history';
import { apmRouter } from '../apm_route_config';

// Guards the `showCriticalPath` boolean route param, which relies on
// `toBooleanFromString` plus a `''` route default: an omitted value must resolve
// to `false` rather than throwing. Reviewer request on elastic/kibana#277439.
const VIEW_PATH = '/services/{serviceName}/transactions/view';

function locationFor(search: string): Location {
  const history = createMemoryHistory();
  history.push(`/services/opbeans-java/transactions/view?${search}`);
  return history.location;
}

// Parent (/services/{serviceName}) requires these with no default.
const requiredQuery = 'rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true';

describe('showCriticalPath route param default', () => {
  it('defaults to false when omitted (via the "" route default)', () => {
    const params = apmRouter.getParams(VIEW_PATH, locationFor(requiredQuery));
    expect(params.query.showCriticalPath).toBe(false);
  });

  it('parses showCriticalPath=true to true', () => {
    const params = apmRouter.getParams(
      VIEW_PATH,
      locationFor(`${requiredQuery}&showCriticalPath=true`)
    );
    expect(params.query.showCriticalPath).toBe(true);
  });

  it('parses showCriticalPath=false to false', () => {
    const params = apmRouter.getParams(
      VIEW_PATH,
      locationFor(`${requiredQuery}&showCriticalPath=false`)
    );
    expect(params.query.showCriticalPath).toBe(false);
  });
});
