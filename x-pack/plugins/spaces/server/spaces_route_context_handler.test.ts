/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRouteHandlerContext } from './spaces_route_context_handler';
import { spacesServiceMock } from './spaces_service/spaces_service.mock';
import { DEFAULT_SPACE_ID } from '../common/constants';

describe('spacesRouteHandlerContext', () => {
  it('can return the default space', async () => {
    const spacesService = spacesServiceMock.createSetupContract(DEFAULT_SPACE_ID);

    const context = createRouteHandlerContext(spacesService);

    const { getSpaceId } = await context({}, {} as any, {} as any);

    expect(getSpaceId()).toBe(DEFAULT_SPACE_ID);
  });

  it('can return a non-default space', async () => {
    const spacesService = spacesServiceMock.createSetupContract('some-space');

    const context = createRouteHandlerContext(spacesService);

    const { getSpaceId } = await context({}, {} as any, {} as any);

    expect(getSpaceId()).toBe('some-space');
  });
});
