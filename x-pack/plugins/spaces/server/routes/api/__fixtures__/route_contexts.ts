/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { LICENSE_STATUS } from '../../../../../licensing/server/constants';

export const mockRouteContext = ({
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        check: LICENSE_STATUS.Valid,
      }),
    },
  },
} as unknown) as RequestHandlerContext;

export const mockRouteContextWithInvalidLicense = ({
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        check: LICENSE_STATUS.Invalid,
        message: 'License is invalid for spaces',
      }),
    },
  },
} as unknown) as RequestHandlerContext;
