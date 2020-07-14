/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectTypeRegistry } from 'kibana/server';

export const getDescriptorNamespace = (
  typeRegistry: ISavedObjectTypeRegistry,
  type: string,
  namespace?: string
) => {
  const descriptorNamespace = typeRegistry.isSingleNamespace(type) ? namespace : undefined;
  return descriptorNamespace === 'default' ? undefined : descriptorNamespace;
};
