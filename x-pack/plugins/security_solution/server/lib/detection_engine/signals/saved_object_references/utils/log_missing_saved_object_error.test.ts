/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { logMissingSavedObjectError } from '.';

describe('log_missing_saved_object_error', () => {
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('logs expect error message', () => {
    logMissingSavedObjectError({
      logger,
      exceptionItem: {
        id: '123',
        list_id: '456',
        type: 'detection',
        namespace_type: 'agnostic',
      },
    });
    expect(logger.error).toBeCalledWith(
      'The saved object references were not found for our exception list when we were expecting to find it. Kibana migrations might not have run correctly or someone might have removed the saved object references manually. Returning the last known good exception list id which might not work. exceptionItem with its id being returned is: {"id":"123","list_id":"456","type":"detection","namespace_type":"agnostic"}'
    );
  });
});
