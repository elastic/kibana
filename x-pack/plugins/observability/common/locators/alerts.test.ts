/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { ALERTS_PATH, AlertsLocatorDefinition } from './alerts';

describe('RuleDetailsLocator', () => {
  const locator = new AlertsLocatorDefinition();
  const baseUrlMock = 'https://kibana.dev';
  const spaceIdMock = 'mockedSpaceId';

  it('should return correct url when only baseUrl and spaceId are provided', async () => {
    const location = await locator.getLocation({ baseUrl: baseUrlMock, spaceId: spaceIdMock });
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(
      `${baseUrlMock}/s/${spaceIdMock}${ALERTS_PATH}?_a=(kuery:%27%27%2CrangeFrom:now-15m%2CrangeTo:now%2Cstatus:all)`
    );
  });

  it('should return correct url when spaceId is default', async () => {
    const location = await locator.getLocation({ baseUrl: baseUrlMock, spaceId: 'default' });
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(
      `${baseUrlMock}${ALERTS_PATH}?_a=(kuery:%27%27%2CrangeFrom:now-15m%2CrangeTo:now%2Cstatus:all)`
    );
  });

  it('should return correct url when time range is provided', async () => {
    const location = await locator.getLocation({
      baseUrl: baseUrlMock,
      spaceId: spaceIdMock,
      rangeFrom: 'mockedRangeTo',
      rangeTo: 'mockedRangeFrom',
    });
    expect(location.path).toEqual(
      `${baseUrlMock}/s/${spaceIdMock}${ALERTS_PATH}?_a=(kuery:%27%27%2CrangeFrom:mockedRangeTo%2CrangeTo:mockedRangeFrom%2Cstatus:all)`
    );
  });

  it('should return correct url when all the params are provided', async () => {
    const location = await locator.getLocation({
      baseUrl: baseUrlMock,
      spaceId: spaceIdMock,
      rangeFrom: 'mockedRangeTo',
      rangeTo: 'mockedRangeFrom',
      kuery: 'mockedKuery',
      status: ALERT_STATUS_ACTIVE,
    });
    expect(location.path).toEqual(
      `${baseUrlMock}/s/${spaceIdMock}${ALERTS_PATH}?_a=(kuery:mockedKuery%2CrangeFrom:mockedRangeTo%2CrangeTo:mockedRangeFrom%2Cstatus:active)`
    );
  });
});
