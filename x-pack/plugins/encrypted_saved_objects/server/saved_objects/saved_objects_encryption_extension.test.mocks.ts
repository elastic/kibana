/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { getDescriptorNamespace } from './get_descriptor_namespace';

export const mockGetDescriptorNamespace = jest.fn() as jest.MockedFunction<
  typeof getDescriptorNamespace
>;

jest.mock('./get_descriptor_namespace', () => {
  return {
    getDescriptorNamespace: mockGetDescriptorNamespace,
  };
});
