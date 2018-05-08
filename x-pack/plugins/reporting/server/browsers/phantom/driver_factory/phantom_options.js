/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getPhantomOptions({ bridgePort, phantomPath }) {
  return {
    parameters: {
      'load-images': true,
      'ssl-protocol': 'any',
      'ignore-ssl-errors': true,
    },
    path: phantomPath,
    bridge: {
      port: bridgePort
    },
  };
}