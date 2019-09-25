/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { AnonymousPaths } from './anonymous_paths';

describe('#isAnonymous', () => {
  it('returns true for initialPaths', () => {
    const { basePath } = coreMock.createSetup({ basePath: '/foo' }).http;
    const anonymousPaths = new AnonymousPaths(basePath, ['/bar', '/baz']);
    expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
    expect(anonymousPaths.isAnonymous('/foo/baz')).toBe(true);
  });

  it('returns true for registered paths', () => {
    const { basePath } = coreMock.createSetup({ basePath: '/foo' }).http;
    const anonymousPaths = new AnonymousPaths(basePath, []);
    anonymousPaths.register('/bar');
    expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
  });

  it('returns false for other paths', () => {
    const { basePath } = coreMock.createSetup({ basePath: '/foo' }).http;
    const anonymousPaths = new AnonymousPaths(basePath, ['/bar', '/baz']);
    anonymousPaths.register('/qux');
    expect(anonymousPaths.isAnonymous('/foo/quux')).toBe(false);
  });
});
