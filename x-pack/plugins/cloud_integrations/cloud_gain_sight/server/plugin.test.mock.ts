/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const registerGainSightRouteMock = jest.fn();
export const registerGainSightStyleRouteMock = jest.fn();
export const registerGainSightWidgetRouteMock = jest.fn();

jest.doMock('./routes', () => ({
  registerGainSightRoute: registerGainSightRouteMock,
  registerGainSightStyleRoute: registerGainSightStyleRouteMock,
  registerGainSightWidgetRoute: registerGainSightWidgetRouteMock,
}));
