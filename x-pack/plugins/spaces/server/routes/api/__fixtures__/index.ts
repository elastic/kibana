/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { createSpaces } from './create_spaces';
export { createMockSavedObjectsRepository } from './create_mock_so_repository';
export { createMockSavedObjectsService } from './create_mock_so_service';
export { mockRouteContext, mockRouteContextWithInvalidLicense } from './route_contexts';
export {
  createExportSavedObjectsToStreamMock,
  createImportSavedObjectsFromStreamMock,
  createResolveSavedObjectsImportErrorsMock,
} from './create_copy_to_space_mocks';
