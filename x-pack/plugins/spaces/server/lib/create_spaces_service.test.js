/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSpacesService } from "./create_spaces_service";

const createRequest = (urlContext) => ({
  getBasePath: () => urlContext ? `/s/${urlContext}` : ''
});

test('returns empty string for the default space', () => {
  const service = createSpacesService();
  expect(service.getUrlContext(createRequest())).toEqual('');
});

test('returns the urlContext for the current space', () => {
  const request = createRequest('my-space-context');
  const service = createSpacesService();
  expect(service.getUrlContext(request)).toEqual('my-space-context');
});
