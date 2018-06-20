/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createErrorGroupWatch } from '../createErrorGroupWatch';
import mustache from 'mustache';
import chrome from 'ui/chrome';
import * as rest from '../../../../../services/rest';
import { isObject, isArray, isString } from 'lodash';
import esResponse from './esResponse.json';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid')
}));

// disable html escaping since this is also disabled in watcher\s mustache implementation
mustache.escape = value => value;

describe('createErrorGroupWatch', () => {
  let createWatchResponse;
  let tmpl;
  beforeEach(async () => {
    chrome.getInjected = jest.fn().mockReturnValue('myIndexPattern');
    jest.spyOn(rest, 'createWatch').mockReturnValue();

    createWatchResponse = await createErrorGroupWatch({
      emails: ['my@email.dk', 'mySecond@email.dk'],
      schedule: {
        daily: {
          at: '08:00'
        }
      },
      serviceName: 'opbeans-node',
      slackUrl: 'https://hooks.slack.com/services/slackid1/slackid2/slackid3',
      threshold: 10,
      timeRange: { value: 24, unit: 'h' }
    });

    const watchBody = rest.createWatch.mock.calls[0][1];
    const templateCtx = {
      payload: esResponse,
      metadata: watchBody.metadata
    };

    tmpl = renderMustache(rest.createWatch.mock.calls[0][1], templateCtx);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should call createWatch with correct args', () => {
    expect(rest.createWatch.mock.calls[0][0]).toBe('apm-mocked-uuid');
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
    const id = rest.createWatch.mock.calls[0][0];
    expect(createWatchResponse).toEqual(id);
  });
});

// Recusively iterate a nested structure and render strings as mustache templates
function renderMustache(input, ctx) {
  if (isString(input)) {
    return mustache.render(input, {
      ctx,
      join: () => (text, render) => render(`{{${text}}}`, { ctx })
    });
  }

  if (isArray(input)) {
    return input.map(itemValue => renderMustache(itemValue, ctx));
  }

  if (isObject(input)) {
    return Object.keys(input).reduce((acc, key) => {
      const value = input[key];

      return { ...acc, [key]: renderMustache(value, ctx) };
    }, {});
  }

  return input;
}
