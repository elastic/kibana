/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isArray, isObject, isString } from 'lodash';
import mustache from 'mustache';
import uuid from 'uuid';
import * as rest from '../../../../../services/rest/watcher';
import { createErrorGroupWatch } from '../createErrorGroupWatch';
import { esResponse } from './esResponse';
import { HttpSetup } from 'kibana/public';

// disable html escaping since this is also disabled in watcher\s mustache implementation
mustache.escape = (value) => value;

jest.mock('../../../../../services/rest/callApi', () => ({
  callApi: () => Promise.resolve(null),
}));

describe('createErrorGroupWatch', () => {
  let createWatchResponse: string;
  let tmpl: any;
  const createWatchSpy = jest
    .spyOn(rest, 'createWatch')
    .mockResolvedValue(undefined);

  beforeEach(async () => {
    jest.spyOn(uuid, 'v4').mockReturnValue(Buffer.from('mocked-uuid'));

    createWatchResponse = await createErrorGroupWatch({
      http: {} as HttpSetup,
      emails: ['my@email.dk', 'mySecond@email.dk'],
      schedule: {
        daily: {
          at: '08:00',
        },
      },
      serviceName: 'opbeans-node',
      slackUrl: 'https://hooks.slack.com/services/slackid1/slackid2/slackid3',
      threshold: 10,
      timeRange: { value: 24, unit: 'h' },
      apmIndexPatternTitle: 'myIndexPattern',
    });

    const watchBody = createWatchSpy.mock.calls[0][0].watch;
    const templateCtx = {
      payload: esResponse,
      metadata: watchBody.metadata,
    };

    tmpl = renderMustache(createWatchSpy.mock.calls[0][0].watch, templateCtx);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should call createWatch with correct args', () => {
    expect(createWatchSpy.mock.calls[0][0].id).toBe('apm-mocked-uuid');
  });

  it('should format slack message correctly', () => {
    expect(tmpl.actions.slack_webhook.webhook.path).toBe(
      '/services/slackid1/slackid2/slackid3'
    );

    expect(
      JSON.parse(tmpl.actions.slack_webhook.webhook.body.slice(10)).text
    ).toMatchSnapshot();
  });

  it('should format email correctly', () => {
    expect(tmpl.actions.email.email.to).toEqual(
      'my@email.dk,mySecond@email.dk'
    );
    expect(tmpl.actions.email.email.subject).toBe(
      '"opbeans-node" has error groups which exceeds the threshold'
    );
    expect(
      tmpl.actions.email.email.body.html.replace(/<br\/>/g, '\n')
    ).toMatchSnapshot();
  });

  it('should format template correctly', () => {
    expect(tmpl).toMatchSnapshot();
  });

  it('should return watch id', async () => {
    const id = createWatchSpy.mock.calls[0][0].id;
    expect(createWatchResponse).toEqual(id);
  });
});

// Recursively iterate a nested structure and render strings as mustache templates
type InputOutput = string | string[] | Record<string, any>;
function renderMustache(
  input: InputOutput,
  ctx: Record<string, unknown>
): InputOutput {
  if (isString(input)) {
    return mustache.render(input, {
      ctx,
      join: () => (text: string, render: any) => render(`{{${text}}}`, { ctx }),
    });
  }

  if (isArray(input)) {
    return input.map((itemValue) => renderMustache(itemValue, ctx));
  }

  if (isObject(input)) {
    return Object.keys(input).reduce((acc, key) => {
      const value = (input as any)[key];

      return { ...acc, [key]: renderMustache(value, ctx) };
    }, {});
  }

  return input;
}
