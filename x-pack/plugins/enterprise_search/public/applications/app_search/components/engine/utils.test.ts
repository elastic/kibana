/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockEngineValues } from '../../__mocks__';

import { generateEnginePath } from './utils';

describe('generateEnginePath', () => {
  mockEngineValues.engineName = 'hello-world';

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
