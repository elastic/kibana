/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./ace/modes/x_json/worker', () => ({
  workerModule: { id: 'ace/mode/json_worker', src: '' },
}));
