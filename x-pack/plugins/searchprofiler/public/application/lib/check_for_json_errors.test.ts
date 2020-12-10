/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { checkForParseErrors } from '.';

describe('checkForParseErrors', function () {
  it('returns error from bad JSON', function () {
    const json = '{"foo": {"bar": {"baz": "buzz}}}';
    const result = checkForParseErrors(json);
    expect(result.error.message).to.be(`Unexpected end of JSON input`);
  });

  it('returns parsed value from good JSON', function () {
    const json = '{"foo": {"bar": {"baz": "buzz"}}}';
    const result = checkForParseErrors(json);
    expect(!!result.parsed).to.be(true);
  });
});
