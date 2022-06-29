/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsSpacesExtension } from '@kbn/core/server';

import { ALL_SPACES_ID } from '../../common/constants';
import { spaceIdToNamespace } from '../lib/utils/namespace';
import type { ISpacesClient } from '../spaces_client';

interface Params {
  activeSpaceId: string;
  spacesClient: ISpacesClient;
}

export class SavedObjectsSpacesExtension implements ISavedObjectsSpacesExtension {
  readonly _activeSpaceId: string;
  readonly _spacesClient: ISpacesClient;

  constructor({ activeSpaceId, spacesClient }: Params) {
    this._activeSpaceId = activeSpaceId;
    this._spacesClient = spacesClient;
  }

  getCurrentNamespace(namespace: string | undefined): string | undefined {
    if (namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }
    return spaceIdToNamespace(this._activeSpaceId);
  }

  async getSearchableNamespaces(namespaces: string[] | undefined): Promise<string[]> {
    if (!namespaces) {
      // If no namespaces option was specified, fall back to the active space.
      return [this._activeSpaceId];
    } else if (!namespaces.length) {
      // If the namespaces option is empty, return early and let the consumer handle it appropriately.
      return namespaces;
    }

    const availableSpaces = await this._spacesClient.getAll({ purpose: 'findSavedObjects' });
    if (namespaces.includes(ALL_SPACES_ID)) {
      return availableSpaces.map((space) => space.id);
    } else {
      return namespaces.filter((namespace) =>
        availableSpaces.some((space) => space.id === namespace)
      );
    }
  }
}
