/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { uploadSourceMapParams } from './route';

describe('uploadSourceMapParams', () => {
  const validSourceMap = {
    version: 3,
    sources: ['foo.js'],
    mappings: 'AAAA',
  };

  it('accepts a valid body with a JSON string sourcemap', () => {
    const result = uploadSourceMapParams.safeParse({
      body: {
        service_name: 'opbeans-java',
        service_version: '1.0.0',
        bundle_filepath: '/foo/bar.js',
        sourcemap: JSON.stringify(validSourceMap),
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.body.sourcemap).toEqual(validSourceMap);
    }
  });

  it('rejects a sourcemap that is not valid JSON', () => {
    expectParseError(
      uploadSourceMapParams.safeParse({
        body: {
          service_name: 'opbeans-java',
          service_version: '1.0.0',
          bundle_filepath: '/foo/bar.js',
          sourcemap: 'not-json',
        },
      })
    );
  });

  it('rejects a sourcemap missing required fields', () => {
    expectParseError(
      uploadSourceMapParams.safeParse({
        body: {
          service_name: 'opbeans-java',
          service_version: '1.0.0',
          bundle_filepath: '/foo/bar.js',
          sourcemap: JSON.stringify({ version: 3 }),
        },
      })
    );
  });

  it('rejects a missing body field', () => {
    expectParseError(
      uploadSourceMapParams.safeParse({
        body: {
          service_version: '1.0.0',
          bundle_filepath: '/foo/bar.js',
          sourcemap: JSON.stringify(validSourceMap),
        },
      })
    );
  });

  describe('max length validation', () => {
    const overLimit = 'a'.repeat(1025);
    const atLimit = 'a'.repeat(1024);

    it('accepts service_name at exactly 1024 characters', () => {
      expectParseSuccess(
        uploadSourceMapParams.safeParse({
          body: {
            service_name: atLimit,
            service_version: '1.0.0',
            bundle_filepath: '/foo/bar.js',
            sourcemap: JSON.stringify(validSourceMap),
          },
        })
      );
    });

    it('rejects service_name longer than 1024 characters', () => {
      expectParseError(
        uploadSourceMapParams.safeParse({
          body: {
            service_name: overLimit,
            service_version: '1.0.0',
            bundle_filepath: '/foo/bar.js',
            sourcemap: JSON.stringify(validSourceMap),
          },
        })
      );
    });

    it('accepts service_version at exactly 1024 characters', () => {
      expectParseSuccess(
        uploadSourceMapParams.safeParse({
          body: {
            service_name: 'opbeans-java',
            service_version: atLimit,
            bundle_filepath: '/foo/bar.js',
            sourcemap: JSON.stringify(validSourceMap),
          },
        })
      );
    });

    it('rejects service_version longer than 1024 characters', () => {
      expectParseError(
        uploadSourceMapParams.safeParse({
          body: {
            service_name: 'opbeans-java',
            service_version: overLimit,
            bundle_filepath: '/foo/bar.js',
            sourcemap: JSON.stringify(validSourceMap),
          },
        })
      );
    });

    it('accepts bundle_filepath at exactly 1024 characters', () => {
      expectParseSuccess(
        uploadSourceMapParams.safeParse({
          body: {
            service_name: 'opbeans-java',
            service_version: '1.0.0',
            bundle_filepath: atLimit,
            sourcemap: JSON.stringify(validSourceMap),
          },
        })
      );
    });

    it('rejects bundle_filepath longer than 1024 characters', () => {
      expectParseError(
        uploadSourceMapParams.safeParse({
          body: {
            service_name: 'opbeans-java',
            service_version: '1.0.0',
            bundle_filepath: overLimit,
            sourcemap: JSON.stringify(validSourceMap),
          },
        })
      );
    });
  });
});
