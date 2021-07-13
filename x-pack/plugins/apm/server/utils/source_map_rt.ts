/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

const sourceMapRt = t.intersection([
  t.type({
    version: t.number,
    sources: t.array(t.string),
    mappings: t.string,
  }),
  t.partial({
    names: t.array(t.string),
    file: t.string,
    sourceRoot: t.string,
    sourcesContent: t.array(t.string),
  }),
]);

export type SourceMap = t.TypeOf<typeof sourceMapRt>;

export const toSourceMapRt = new t.Type<SourceMap, Buffer | string, unknown>(
  'toSourceMapRt',
  (u): u is SourceMap => u !== undefined,
  (input, context) => {
    return either.chain(
      t.unknown.validate(input, context),
      (inputAsUnknown) => {
        const sourceMapJson = JSON.parse((inputAsUnknown as Buffer).toString());
        const sourcemap = sourceMapRt.decode(sourceMapJson);
        return sourcemap;
      }
    );
  },
  (sourceMap) => {
    return Buffer.from(JSON.stringify(sourceMap));
  }
);
