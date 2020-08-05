/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { normalizeVersionString } from '../normalize_version_string';

describe('Normalizing Version String', () => {
  it('Returns version string when valid', () => {
    const result = normalizeVersionString('1.2.30');
    expect(result).to.be('1.2.30');
  });
  it('Strips -SNAPSHOT from a valid string', () => {
    const result = normalizeVersionString('1.2.30-SNAPSHOT');
    expect(result).to.be('1.2.30');
  });
  it('Returns empty string when invalid', () => {
    const result = normalizeVersionString('foo-SNAPSHOT');
    expect(result).to.be('');
  });
});
