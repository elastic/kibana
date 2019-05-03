/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import * as os from 'os';
import sinon from 'sinon';
import { SymbolKind } from 'vscode-languageserver-protocol';
import { CtagsIndexAdapter } from './ctags_index_adapter';
import { Tag } from '../../model';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code_ctags_test'));

afterEach(() => {
  sinon.restore();
});

async function download(url, path) {
  log(`Downloading ${url}`);

  const hash = createHash('md5');

  mkdirp.sync(dirname(path));
  const handle = openSync(path, 'w');

  try {
    const readable = request(url).on('data', chunk => {
      writeSync(handle, chunk);
      hash.update(chunk);
    });
    await readableEnd(readable);
  } finally {
    closeSync(handle);
  }

  return hash.digest('hex');
}

test('Transform ctags index format to DetailSymbolInformation format', () => {
  const symbols = CtagsIndexAdapter.ctags2DetailSymbol([new Tag(382, 'getFieldLabel', 'method', ' public static void getFieldLabel(IField field, long flags, StringBuilder builder) {', 'JavaElementLabels', '(IField field, long flags, StringBuilder builder)', 20, 33, 'JavaElementLabels')]);
  expect(symbols.length).toEqual(1);
  expect(symbols[0].qname).toEqual('getFieldLabel');
  expect(symbols[0].symbolInformation.kind).toEqual(SymbolKind.Method);
  expect(symbols[0].symbolInformation.containerName).toEqual('JavaElementLabels');
  expect(symbols[0].symbolInformation.location.range.start.line).toEqual(382);
  expect(symbols[0].symbolInformation.location.range.start.character).toEqual(20);
  expect(symbols[0].symbolInformation.location.range.end.character).toEqual(33);
});
