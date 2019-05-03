/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { CtagsRunner } from './ctags_runner';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { ServerOptions } from '../server_options';
import { createTestServerOption } from '../test_utils';

const options: ServerOptions = createTestServerOption();

afterEach(() => {
  sinon.restore();
})

test('simple test for ctags runner', async () => {
  const ctagsRunner: CtagsRunner = new CtagsRunner(options, new ConsoleLoggerFactory());
  await ctagsRunner.doCtags('/Users/poytr1/github/java-langserver/org.elastic.jdt.ls.core/src/org/elastic/jdt/ls/core/internal/hover/JavaElementLabels.java');
  expect(ctagsRunner.getAllTags.length).toEqual(10);
});
