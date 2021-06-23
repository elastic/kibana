/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockEngineValues } from '../../__mocks__';

import { generateEnginePath, getEngineBreadcrumbs } from './utils';

describe('generateEnginePath', () => {
  beforeEach(() => {
    mockEngineValues.engineName = 'hello-world';
  });

  it('generates paths with engineName filled from state', () => {
    expect(generateEnginePath('/engines/:engineName/example')).toEqual(
      '/engines/hello-world/example'
    );
  });

  it('allows overriding engineName and filling other params', () => {
    expect(
      generateEnginePath('/engines/:engineName/foo/:bar', {
        engineName: 'override',
        bar: 'baz',
      })
    ).toEqual('/engines/override/foo/baz');
  });
});

describe('getEngineBreadcrumbs', () => {
  beforeEach(() => {
    mockEngineValues.engineName = 'foo';
  });

  it('generates breadcrumbs with engineName filled from state', () => {
    expect(getEngineBreadcrumbs(['bar', 'baz'])).toEqual(['Engines', 'foo', 'bar', 'baz']);
    expect(getEngineBreadcrumbs(['bar'])).toEqual(['Engines', 'foo', 'bar']);
    expect(getEngineBreadcrumbs()).toEqual(['Engines', 'foo']);
  });
});
