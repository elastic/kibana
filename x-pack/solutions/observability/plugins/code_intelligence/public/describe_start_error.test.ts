/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeStartError } from './describe_start_error';

const repository = 'elastic/example';

/** Mirrors the parsed body Kibana's `http.post` attaches to a failed response. */
const httpError = (statusCode: number, body: unknown) =>
  Object.assign(new Error('Request failed'), { response: { status: statusCode }, body });

describe('describeStartError', () => {
  it('explains an extraction that is already running and offers to follow it', () => {
    const description = describeStartError(
      httpError(409, {
        statusCode: 409,
        message: 'An extraction for elastic/example is already running.',
        attributes: { code: 'extraction_already_running', repository, extractionId: 'running-id' },
      }),
      repository
    );

    expect(description.title).toBe('An extraction for elastic/example is already running');
    expect(description.explanation).toContain('another Kibana instance');
    expect(description.suggestions).toHaveLength(4);
    expect(description.suggestions.join(' ')).toContain(
      'code_intelligence_extraction:elastic/example'
    );
    expect(description.extractionId).toBe('running-id');
  });

  it('does not offer to follow a run held by another instance', () => {
    const description = describeStartError(
      httpError(409, { attributes: { code: 'extraction_already_running', repository } }),
      repository
    );

    expect(description.title).toContain(repository);
    expect(description.extractionId).toBeUndefined();
  });

  it('explains a repository that is no longer configured', () => {
    const description = describeStartError(
      httpError(400, { attributes: { code: 'repository_not_configured', repository } }),
      repository
    );

    expect(description.title).toBe('elastic/example is no longer configured');
    expect(description.suggestions.join(' ')).toContain('xpack.code_intelligence.repositories');
    expect(description.extractionId).toBeUndefined();
  });

  it('explains exhausted tracking capacity', () => {
    const description = describeStartError(
      httpError(429, { attributes: { code: 'extraction_capacity_exhausted', repository } }),
      repository
    );

    expect(description.title).toContain(repository);
    expect(description.explanation).toContain('100');
    expect(description.suggestions.length).toBeGreaterThan(0);
  });

  it('falls back to the server message for an unknown code', () => {
    const description = describeStartError(
      httpError(500, { statusCode: 500, message: 'An internal server error occurred.' }),
      repository
    );

    expect(description.title).toBe('The extraction for elastic/example could not be started');
    expect(description.explanation).toBe('An internal server error occurred.');
    expect(description.suggestions.join(' ')).toContain('Kibana server log');
  });

  it('does not key on the status code alone', () => {
    const description = describeStartError(
      httpError(409, { message: 'Conflict with something else.' }),
      repository
    );

    expect(description.title).toBe('The extraction for elastic/example could not be started');
    expect(description.explanation).toBe('Conflict with something else.');
  });

  it.each([
    ['a network error without a body', new TypeError('Failed to fetch')],
    ['a non-error value', 'boom'],
    ['null', null],
    ['an empty message', httpError(502, { message: '   ' })],
  ])('falls back to a generic explanation for %s', (_label, error) => {
    const description = describeStartError(error, repository);

    expect(description.title).toBe('The extraction for elastic/example could not be started');
    expect(description.explanation.length).toBeGreaterThan(0);
    expect(description.suggestions.length).toBeGreaterThan(0);
    expect(description.extractionId).toBeUndefined();
  });
});
