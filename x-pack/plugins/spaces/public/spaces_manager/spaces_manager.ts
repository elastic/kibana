/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { skipWhile } from 'rxjs/operators';

import type {
  HttpSetup,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
} from '@kbn/core/public';

import type {
  GetAllSpacesOptions,
  GetSpaceResult,
  LegacyUrlAliasTarget,
  Space,
} from '../../common';
import type { CopySavedObjectsToSpaceResponse } from '../copy_saved_objects_to_space/types';

interface SavedObjectTarget {
  type: string;
  id: string;
}

const TAG_TYPE = 'tag';

export class SpacesManager {
  private activeSpace$: BehaviorSubject<Space | null> = new BehaviorSubject<Space | null>(null);

  private readonly serverBasePath: string;

  private readonly _onActiveSpaceChange$: Observable<Space>;

  constructor(private readonly http: HttpSetup) {
    this.serverBasePath = http.basePath.serverBasePath;

    this._onActiveSpaceChange$ = this.activeSpace$
      .asObservable()
      .pipe(skipWhile((v: Space | null) => v == null)) as Observable<Space>;
  }

  public get onActiveSpaceChange$() {
    if (!this.activeSpace$.value) {
      this.refreshActiveSpace();
    }
    return this._onActiveSpaceChange$;
  }

  public async getSpaces(options: GetAllSpacesOptions = {}): Promise<GetSpaceResult[]> {
    const { purpose, includeAuthorizedPurposes } = options;
    const query = { purpose, include_authorized_purposes: includeAuthorizedPurposes };
    return await this.http.get('/api/spaces/space', { query });
  }

  public async getSpace(id: string): Promise<Space> {
    return await this.http.get(`/api/spaces/space/${encodeURIComponent(id)}`);
  }

  public async getActiveSpace({ forceRefresh = false } = {}) {
    if (this.isAnonymousPath()) {
      throw new Error(`Cannot retrieve the active space for anonymous paths`);
    }
    if (forceRefresh || !this.activeSpace$.value) {
      await this.refreshActiveSpace();
    }
    return this.activeSpace$.value!;
  }

  public async createSpace(space: Space) {
    await this.http.post(`/api/spaces/space`, {
      body: JSON.stringify(space),
    });
  }

  public async updateSpace(space: Space) {
    await this.http.put(`/api/spaces/space/${encodeURIComponent(space.id)}`, {
      query: {
        overwrite: true,
      },
      body: JSON.stringify(space),
    });

    const activeSpaceId = (await this.getActiveSpace()).id;

    if (space.id === activeSpaceId) {
      this.refreshActiveSpace();
    }
  }

  public async deleteSpace(space: Space) {
    await this.http.delete(`/api/spaces/space/${encodeURIComponent(space.id)}`);
  }

  public async disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]) {
    await this.http.post('/api/spaces/_disable_legacy_url_aliases', {
      body: JSON.stringify({ aliases }),
    });
  }

  public async copySavedObjects(
    objects: SavedObjectTarget[],
    spaces: string[],
    includeReferences: boolean,
    createNewCopies: boolean,
    overwrite: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return this.http.post('/api/spaces/_copy_saved_objects', {
      body: JSON.stringify({
        objects,
        spaces,
        includeReferences,
        createNewCopies,
        ...(createNewCopies ? { overwrite: false } : { overwrite }), // ignore the overwrite option if createNewCopies is enabled
      }),
    });
  }

  public async resolveCopySavedObjectsErrors(
    objects: SavedObjectTarget[],
    retries: unknown,
    includeReferences: boolean,
    createNewCopies: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return this.http.post(`/api/spaces/_resolve_copy_saved_objects_errors`, {
      body: JSON.stringify({
        objects,
        includeReferences,
        createNewCopies,
        retries,
      }),
    });
  }

  public async getShareSavedObjectPermissions(
    type: string
  ): Promise<{ shareToAllSpaces: boolean }> {
    return this.http
      .get<{ shareToAllSpaces: boolean }>('/internal/security/_share_saved_object_permissions', {
        query: { type },
      })
      .catch((err) => {
        const isNotFound = err?.body?.statusCode === 404;
        if (isNotFound) {
          // security is not enabled
          return { shareToAllSpaces: true };
        }
        throw err;
      });
  }

  public async getShareableReferences(
    objects: SavedObjectTarget[]
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    const response = await this.http.post<SavedObjectsCollectMultiNamespaceReferencesResponse>(
      `/api/spaces/_get_shareable_references`,
      { body: JSON.stringify({ objects }) }
    );

    // We should exclude any child-reference tags because we don't yet support reconciling/merging duplicate tags. In other words: tags can
    // be shared directly, but if a tag is only included as a reference of a requested object, it should not be shared.
    const requestedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const filteredObjects = response.objects.filter(
      ({ type, id }) => type !== TAG_TYPE || requestedObjectsSet.has(`${type}:${id}`)
    );
    return { objects: filteredObjects };
  }

  public async updateSavedObjectsSpaces(
    objects: SavedObjectTarget[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ): Promise<void> {
    return this.http.post(`/api/spaces/_update_objects_spaces`, {
      body: JSON.stringify({ objects, spacesToAdd, spacesToRemove }),
    });
  }

  public redirectToSpaceSelector() {
    window.location.href = `${this.serverBasePath}/spaces/space_selector`;
  }

  private async refreshActiveSpace() {
    // Anonymous paths (such as login/logout) should not request the active space under any circumstances.
    if (this.isAnonymousPath()) {
      return;
    }
    const activeSpace = await this.http.get<Space>('/internal/spaces/_active_space');
    this.activeSpace$.next(activeSpace);
  }

  private isAnonymousPath() {
    return this.http.anonymousPaths.isAnonymous(window.location.pathname);
  }
}
