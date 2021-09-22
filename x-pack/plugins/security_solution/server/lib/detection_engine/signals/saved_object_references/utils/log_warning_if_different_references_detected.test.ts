/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';

import { logWarningIfDifferentReferencesDetected } from '.';

describe('log_warning_if_different_references_detected', () => {
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('logs expect error message if the two ids are different', () => {
    logWarningIfDifferentReferencesDetected({
      logger,
      savedObjectReferenceId: '123',
      savedObjectId: '456',
    });
    expect(logger.error).toBeCalledWith(
      'The id of the "saved object reference id": 123 is not the same as the "saved object id": 456. Preferring and using the "saved object reference id" instead of the "saved object id"'
    );
  });

  test('logs nothing if the two ids are the same', () => {
    logWarningIfDifferentReferencesDetected({
      logger,
      savedObjectReferenceId: '123',
      savedObjectId: '123',
    });
    expect(logger.error).not.toHaveBeenCalled();
  });
});
