/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { actionsClientMock } from '../../../../../actions/server/mocks';
import { getActions } from '../__mocks__/request_responses';

export const createRouteContext = (client: any) => {
  const actionsMock = actionsClientMock.create();
  actionsMock.getAll.mockImplementation(() => Promise.resolve(getActions()));

  return ({
    core: {
      savedObjects: {
        client,
      },
    },
    actions: { getActionsClient: () => actionsMock },
  } as unknown) as RequestHandlerContext;
};
