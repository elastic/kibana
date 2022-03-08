/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticationExpiredError } from '.';

describe('ReportingError', () => {
  it('provides error code when stringified', () => {
    expect(new AuthenticationExpiredError() + '').toBe(
      `ReportingError(code: authentication_expired)`
    );
  });
  it('provides details if there are any and error code when stringified', () => {
    expect(new AuthenticationExpiredError('some details') + '').toBe(
      `ReportingError(code: authentication_expired) "some details"`
    );
  });
});
