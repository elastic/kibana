/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { join } from 'path';
import { Logger } from 'kibana/server';

import { ConsoleSetup } from '../../../../../src/plugins/console/server';
import { processors } from './ingest';

export const installExtensions = (
  { addExtensionSpecFilePath, addProcessorDefinition }: ConsoleSetup,
  log: Logger
) => {
  addExtensionSpecFilePath(join(__dirname, 'spec/'));
  processors.forEach(processor => addProcessorDefinition(processor));
  log.debug('Installed console autocomplete extensions.');
};
