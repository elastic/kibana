/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsSpacesExtension } from '@kbn/core-saved-objects-server';

import { ALL_SPACES_ID } from '../../common/constants';
import { spaceIdToNamespace } from '../lib/utils/namespace';
import type { ISpacesClient } from '../spaces_client';

interface Params {
  activeSpaceId: string;
  spacesClient: ISpacesClient;
}

export class SavedObjectsSpacesExtension implements ISavedObjectsSpacesExtension {
  private readonly activeSpaceId: string;
  private readonly spacesClient: ISpacesClient;

  constructor({ activeSpaceId, spacesClient }: Params) {
    this.activeSpaceId = activeSpaceId;
    this.spacesClient = spacesClient;
  }

  getCurrentNamespace(namespace: string | undefined): string | undefined {
    if (namespace) {
      throw new Error(
        'Namespace cannot be specified by the caller when the spaces extension is enabled. Spaces currently determines the namespace.'
      );
    }
    return spaceIdToNamespace(this.activeSpaceId);
  }

  async getSearchableNamespaces(namespaces: string[] | undefined): Promise<string[]> {
    if (!namespaces) {
      // If no namespaces option was specified, fall back to the active space.
      return [this.activeSpaceId];
    } else if (!namespaces.length) {
      // If the namespaces option is empty, return early and let the consumer handle it appropriately.
      return namespaces;
    }

    const availableSpaces = await this.spacesClient.getAll({ purpose: 'findSavedObjects' });
    if (namespaces.includes(ALL_SPACES_ID)) {
      return availableSpaces.map((space) => space.id);
    } else {
      return namespaces.filter((namespace) =>
        availableSpaces.some((space) => space.id === namespace)
      );
    }
  }
}
