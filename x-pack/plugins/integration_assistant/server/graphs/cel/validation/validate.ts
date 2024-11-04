/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import './wasm_exec';
import './wasm_types';

const file = fs.readFileSync(path.join(__dirname, 'celformat.wasm'));
let wasm: WebAssembly.Instance;

export async function loadWasm(input: string): Promise<string> {
  // @ts-expect-error
  const goWasm = new Go();
  let value;
  try {
    const result = await WebAssembly.instantiate(file, goWasm.importObject);
    wasm = result.instance;
    goWasm.run(wasm);
    value = global.formatCelProgram(input);

    if (value === undefined) {
      throw new Error('Failed to format CEL program');
    }
    if (value.Err) {
      // Parse Error of the CEL program
      throw new Error(value.Err);
    }
  } finally {
    global.stopFormatCelProgram();
  }
  return JSON.stringify(value.Format);
}
