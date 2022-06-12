/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';

// Provides global.Go runtime
import './wasm_exec';
// @ts-expect-error
const go = new Go();

const wasmBuffer = fs.readFileSync(path.join(__dirname, 'validator.wasm'));
/**
 * Validates a zip archive using the package-spec
 */
export async function validateZipBufferWithPackageSpec(
  name: string,
  size: number,
  buffer: Uint8Array
): Promise<void> {
  const validator = await WebAssembly.instantiate(wasmBuffer, go.importObject);
  go.run(validator.instance);

  try {
    // @ts-expect-error
    await global.elasticPackageSpec.validateFromZipReader(name, size, buffer);
  } finally {
    // @ts-expect-error
    global.elasticPackageSpec.stop();
  }
}
