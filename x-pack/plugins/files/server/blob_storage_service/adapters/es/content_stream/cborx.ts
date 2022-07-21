/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: cbor-x uses ESM modules and attempts to load a dependency when imported.
//       When running in a Jest test environment detects "window" and causes
//       a warning to be printed to the console: "For browser usage, directly use cbor-x/decode or cbor-x/encode modules..."
//       we should clean this up.
//       Also opened the following issue: https://github.com/kriszyp/cbor-x/issues/36
// TODO: use import once type declarations for the lib are fixed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cborx = require('cbor-x');

export const encode: (arg: unknown) => Buffer = cborx.encode;
export const decode: <T = unknown>(buf: Uint8Array | Buffer) => T = cborx.decode;
