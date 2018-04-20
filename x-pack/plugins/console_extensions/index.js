/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { join } from 'path';
export function consoleExtensions(kibana) {
  return new kibana.Plugin({
    id: 'console_extensions',
    require: ['kibana', 'console'],
    init: server => {
      if (
        server.plugins.console &&
        server.plugins.console.addExtensionSpecFilePath
      ) {
        server.plugins.console.addExtensionSpecFilePath(
          join(__dirname, 'spec')
        );
      } else {
        console.warn(
          'Missing server.plugins.console.addExtensionSpecFilePath extension point.',
          'Cannot add xpack APIs to autocomplete.'
        );
      }
    }
  });
}
