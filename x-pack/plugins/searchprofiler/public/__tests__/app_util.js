/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { checkForParseErrors } from '../app_util.js';

describe('checkForParseErrors', function () {
  it('returns false from bad JSON', function () {
    const json = '{"foo": {"bar": {"baz": "buzz}}}';
    const result = checkForParseErrors(json);
    expect(result.status).to.be(false);
  });

  it('returns true from good JSON', function () {
    const json = '{"foo": {"bar": {"baz": "buzz"}}}';
    const result = checkForParseErrors(json);
    expect(result.status).to.be(true);
  });
});
