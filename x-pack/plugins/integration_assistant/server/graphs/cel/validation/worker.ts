/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import './wasm/wasm_exec';
import { parentPort, isMainThread } from 'worker_threads';

declare global {
  export function formatCelProgram(input: string): { Format: string; Err?: string };
  export function stopFormatCelProgram(): void;
  var process: NodeJS.Process;
}

export interface ValidateCelRequest {
  data: { inputProgram: string };
}

export enum ValidateCelResponseType {
  Log,
  Data,
  Error,
}

export interface ValidateCelData {
  formattedProgram: string;
}

interface ValidateCelLogResponse {
  type: ValidateCelResponseType.Log;
  data?: ValidateCelData;
  error?: string;
  message?: string;
}

interface ValidateCelDataResponse {
  type: ValidateCelResponseType.Data;
  data?: ValidateCelData;
  error?: string;
  message?: string;
}

interface ValidateCelErrorResponse {
  type: ValidateCelResponseType.Error;
  data?: ValidateCelData;
  error?: string;
  message?: string;
}
export type ValidateCelResponse =
  | ValidateCelLogResponse
  | ValidateCelDataResponse
  | ValidateCelErrorResponse;

if (!isMainThread) {
  console.log("Initializing worker", process.memoryUsage());
  if (parentPort) {
    parentPort.on('message', execute);
  }
}

async function execute({ data: { inputProgram } }: ValidateCelRequest) {
  console.log('Calling ValidateCel in Worker', process.memoryUsage());
  const wasmPath = path.join(__dirname, 'wasm');
  const file = fs.readFileSync(path.join(wasmPath, 'celformat.wasm'));
  // @ts-expect-error
  const goWasm = new Go();
  let value;
  try {
    const result = await WebAssembly.instantiate(file, goWasm.importObject);
    const wasm = result.instance;
    goWasm.run(wasm);
    console.log("WASM loaded",  process.memoryUsage());
    value = global.formatCelProgram(inputProgram);
    console.log("Validation in WASM executed: ", process.memoryUsage());
    
  } finally {
    console.log("Stopping WASM", process.memoryUsage());
    global.stopFormatCelProgram();
    console.log("Stopped WASM", process.memoryUsage());
  }

  if (value === undefined) {
    const errorResponse: ValidateCelResponse = {
      type: ValidateCelResponseType.Error,
      error: 'Failed to format CEL Program',
    };
    if (parentPort) {
      parentPort.postMessage(errorResponse);
    }
  }

  if (value.Err) {
    const errorResponse: ValidateCelResponse = {
      type: ValidateCelResponseType.Error,
      error: value.Err,
    };
    if (parentPort) {
      parentPort.postMessage(errorResponse);
    }
  } else {
    const successResponse: ValidateCelResponse = {
      type: ValidateCelResponseType.Data,
      data: {
        formattedProgram: value.Format,
      },
    };
    console.log('Worker: Posting message back to main script');
    console.log("Done with validation", process.memoryUsage());
    if (parentPort) {
      parentPort.postMessage(successResponse);
    }
  }
}
