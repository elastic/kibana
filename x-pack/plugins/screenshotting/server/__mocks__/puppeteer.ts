/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const stubDevTools = {
  send: jest.fn(),
};
const stubTarget = {
  createCDPSession: jest.fn(() => {
    return stubDevTools;
  }),
};
const stubPage = {
  target: jest.fn(() => {
    return stubTarget;
  }),
  emulateTimezone: jest.fn(),
  setDefaultTimeout: jest.fn(),
  isClosed: jest.fn(),
  setViewport: jest.fn(),
  evaluate: jest.fn(),
  screenshot: jest.fn().mockResolvedValue(`you won't believe this one weird screenshot`),
  evaluateOnNewDocument: jest.fn(),
  setRequestInterception: jest.fn(),
  _client: jest.fn(() => ({ on: jest.fn() })),
  on: jest.fn(),
  goto: jest.fn(),
  waitForSelector: jest.fn().mockResolvedValue(true),
  waitForFunction: jest.fn(),
};
const stubBrowser = {
  newPage: jest.fn(() => {
    return stubPage;
  }),
};

const puppeteer = {
  launch: jest.fn(() => {
    return stubBrowser;
  }),
};

// eslint-disable-next-line import/no-default-export
export default puppeteer;
