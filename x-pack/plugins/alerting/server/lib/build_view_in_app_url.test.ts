/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SanitizedRule } from '../../common';
import { buildViewInAppUrl } from './build_view_in_app_url';

const mockedRule: SanitizedRule<{}> = {
  id: '1',
  alertTypeId: '1',
  schedule: { interval: '10s' },
  params: {
    bar: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  actions: [
    {
      group: 'default',
      id: '2',
      actionTypeId: 'test',
      params: {
        foo: true,
      },
    },
  ],
  consumer: 'bar',
  name: 'abc',
  tags: ['foo'],
  enabled: true,
  muteAll: false,
  notifyWhen: 'onActionGroupChange',
  createdBy: '',
  updatedBy: '',
  apiKeyOwner: '',
  throttle: '30s',
  mutedInstanceIds: [],
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
};

describe('buildViewInAppUrl', () => {
  const defaultOpts = {
    kibanaBaseUrl: 'http://localhost:5601',
    spaceId: 'default',
    getViewInAppRelativeUrl: jest.fn(),
    opts: {
      rule: mockedRule,
    },
    logger: loggingSystemMock.create().get(),
  };

  beforeEach(() => {
    defaultOpts.getViewInAppRelativeUrl.mockReset();
    defaultOpts.getViewInAppRelativeUrl.mockReturnValue('/app/foo/123');
  });

  it(`should return undefined if kibanaBaseUrl isn't defined`, () => {
    const result = buildViewInAppUrl({ ...defaultOpts, kibanaBaseUrl: undefined });
    expect(result).toBeUndefined();
  });

  it(`should return undefined when getViewInAppRelativeUrl function isn't passed in`, () => {
    const result = buildViewInAppUrl({ ...defaultOpts, getViewInAppRelativeUrl: undefined });
    expect(result).toBeUndefined();
  });

  it(`should call getViewInAppRelativeUrl() to get the relative URL`, () => {
    buildViewInAppUrl(defaultOpts);
    expect(defaultOpts.getViewInAppRelativeUrl).toHaveBeenCalled();
  });

  it(`should build a URL in the default space properly`, () => {
    const result = buildViewInAppUrl(defaultOpts);
    expect(result).toEqual('http://localhost:5601/app/foo/123');
  });

  it(`should build a URL in a specific space properly`, () => {
    const result = buildViewInAppUrl({ ...defaultOpts, spaceId: 'my-space' });
    expect(result).toEqual('http://localhost:5601/s/my-space/app/foo/123');
  });
});
