/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createErrorGroupWatch } from '../createErrorGroupWatch';
import chrome from 'ui/chrome';
import * as rest from '../../../../../services/rest';

describe('createErrorGroupWatch', () => {
  let res;
  beforeEach(async () => {
    chrome.getInjected = jest.fn().mockReturnValue('myIndexPattern');
    jest.spyOn(rest, 'createWatch').mockReturnValue();

    res = await createErrorGroupWatch({
      emails: ['my@email.dk'],
      schedule: {
        daily: {
          at: '08:00'
        }
      },
      serviceName: 'opbeans-node',
      slackUrl: 'https://hooks.slack.com/services/slackid1/slackid2/slackid3',
      threshold: 10,
      timeRange: 'now-24h'
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('should call createWatch with correct args', () => {
    expect(rest.createWatch.mock.calls[0][0]).toContain('apm-');
    expect(rest.createWatch.mock.calls[0][1]).toMatchSnapshot();
  });

  it('should format slack message correctly', () => {
    expect(
      JSON.parse(
        rest.createWatch.mock.calls[0][1].actions.slack_webhook.webhook.body
      ).text
    ).toMatchSnapshot();
  });

  it('should return watch id', async () => {
    const id = rest.createWatch.mock.calls[0][0];
    expect(res).toEqual(id);
  });
});
