/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { urlFiltersToKueryString } from './stringify_kueries';
import { UrlFilter } from '../types';
import { USER_AGENT_NAME } from '../configurations/constants/elasticsearch_fieldnames';

describe('stringifyKueries', () => {
  let filters: UrlFilter[];
  beforeEach(() => {
    filters = [
      {
        field: USER_AGENT_NAME,
        values: ['Chrome', 'Firefox'],
        notValues: [],
      },
    ];
  });

  it('stringifies the current values', () => {
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"user_agent.name: (\\"Chrome\\" or \\"Firefox\\")"`
    );
  });

  it('correctly stringifies a single value', () => {
    filters = [
      {
        field: USER_AGENT_NAME,
        values: ['Chrome'],
        notValues: [],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"user_agent.name: \\"Chrome\\""`
    );
  });

  it('returns an empty string for an empty array', () => {
    expect(urlFiltersToKueryString([])).toMatchInlineSnapshot(`""`);
  });

  it('returns an empty string for an empty value', () => {
    filters = [
      {
        field: USER_AGENT_NAME,
        values: [],
        notValues: [],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(`""`);
  });

  it('adds quotations if the value contains a space', () => {
    filters = [
      {
        field: USER_AGENT_NAME,
        values: ['Google Chrome'],
        notValues: [],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"user_agent.name: \\"Google Chrome\\""`
    );
  });

  it('adds quotations inside parens if there are values containing spaces', () => {
    filters = [
      {
        field: USER_AGENT_NAME,
        values: ['Google Chrome'],
        notValues: ['Apple Safari'],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"user_agent.name: \\"Google Chrome\\" and not (user_agent.name: \\"Apple Safari\\")"`
    );
  });

  it('handles parens for values with greater than 2 items', () => {
    filters = [
      {
        field: USER_AGENT_NAME,
        values: ['Chrome', 'Firefox', 'Safari', 'Opera'],
        notValues: ['Safari'],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"user_agent.name: (\\"Chrome\\" or \\"Firefox\\" or \\"Safari\\" or \\"Opera\\") and not (user_agent.name: \\"Safari\\")"`
    );
  });

  it('handles colon characters in values', () => {
    filters = [
      {
        field: 'url',
        values: ['https://elastic.co', 'https://example.com'],
        notValues: [],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"url: (\\"https://elastic.co\\" or \\"https://example.com\\")"`
    );
  });

  it('handles precending empty array', () => {
    filters = [
      {
        field: 'url',
        values: ['https://elastic.co', 'https://example.com'],
        notValues: [],
      },
      {
        field: USER_AGENT_NAME,
        values: [],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"url: (\\"https://elastic.co\\" or \\"https://example.com\\")"`
    );
  });

  it('handles skipped empty arrays', () => {
    filters = [
      {
        field: 'url',
        values: ['https://elastic.co', 'https://example.com'],
        notValues: [],
      },
      {
        field: USER_AGENT_NAME,
        values: [],
      },
      {
        field: 'url',
        values: ['https://elastic.co', 'https://example.com'],
        notValues: [],
      },
    ];
    expect(urlFiltersToKueryString(filters)).toMatchInlineSnapshot(
      `"url: (\\"https://elastic.co\\" or \\"https://example.com\\") and url: (\\"https://elastic.co\\" or \\"https://example.com\\")"`
    );
  });
});
