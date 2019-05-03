/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mkdtempSync, openSync, writeSync, closeSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import request from 'request';
import * as os from 'os';
import sinon from 'sinon';
import { CtagsRunner } from './ctags_runner';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { ServerOptions } from '../server_options';
import { createTestServerOption } from '../test_utils';

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'code_ctags_test'));

const options: ServerOptions = createTestServerOption();

afterEach(() => {
  sinon.restore();
});

function readableEnd(stream: request.Request) {
  return new Promise((resolve, reject) => {
    stream.on('error', reject).on('end', resolve);
  });
}

async function downloadTmpFile(url: string) {
  const hash = createHash('md5');
  const handle = openSync(path.resolve(tmpDir, 'tmp.java'), 'w');

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

test('simple test for ctags runner', async () => {
  const ctagsRunner: CtagsRunner = new CtagsRunner(options, new ConsoleLoggerFactory());
  await downloadTmpFile('https://raw.githubusercontent.com/elastic/elasticsearch/master/server/src/main/java/org/elasticsearch/ExceptionsHelper.java');
  ctagsRunner.doCtags(path.resolve(tmpDir, 'tmp.java'));
  ctagsRunner.exit();
  const tags = await ctagsRunner.getAllTags();
  expect(tags.length).toEqual(29);
});
