/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('./wasm/wasm_exec');

globalThis.require = require;
globalThis.fs = require('fs');

const go = new Go();
go.exit = process.exit;
go.myEcho = global.myEcho;
let instance;
init();

async function init() {
  result = await WebAssembly.instantiate(fs.readFileSync('celformat.wasm'), go.importObject);

  instance = result.instance;
  console.log('1');
  await go.run(instance);
  console.log('2');
  console.log(go.myEcho);
}
