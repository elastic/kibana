/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';

export function spaceIdToNamespace(spaceId: string): string | undefined {
  if (!spaceId) {
    throw new TypeError('spaceId is required');
  }

  if (spaceId === DEFAULT_SPACE_ID) {
    return undefined;
  }

  return spaceId;
}

export function namespaceToSpaceId(namespace: string | undefined): string {
  if (namespace === '') {
    throw new TypeError('namespace cannot be an empty string');
  }

  if (!namespace) {
    return DEFAULT_SPACE_ID;
  }

  return namespace;
}
