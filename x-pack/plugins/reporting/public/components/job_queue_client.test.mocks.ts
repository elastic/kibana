/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockAPIClient = {
  http: jest.fn(),
  list: jest.fn(),
  total: jest.fn(),
  getInfo: jest.fn(),
  getContent: jest.fn(),
  getReportURL: jest.fn(),
  downloadReport: jest.fn(),
};

jest.mock('../lib/reporting_api_client', () => mockAPIClient);
