/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import './wasm/wasm_exec';

const wasmPath = path.join(__dirname, 'wasm');
const file = fs.readFileSync(path.join(wasmPath, 'celformat.wasm'));
let wasm: WebAssembly.Instance;

export async function validate(input: string): Promise<string> {
  // @ts-expect-error
  const goWasm = new Go();
  let value;
  try {
    console.log("Before loading WASM", process.memoryUsage());
    const result = await WebAssembly.instantiate(file, goWasm.importObject);
    wasm = result.instance;
    goWasm.run(wasm);
    console.log("WASM loaded", process.memoryUsage());

    value = global.formatCelProgram(input);

    console.log("Run function", process.memoryUsage());

    if (value === undefined) {
      throw new Error('Failed to format CEL program');
    }
    if (value.Err) {
      // Parse Error of the CEL program
      throw new Error(value.Err);
    }
  } finally {
    global.stopFormatCelProgram();
    console.log("Stop Main in WASM", process.memoryUsage());
  }
  return value.Format;
}
