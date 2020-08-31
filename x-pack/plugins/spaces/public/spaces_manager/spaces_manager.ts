/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable, BehaviorSubject } from 'rxjs';
import { skipWhile } from 'rxjs/operators';
import { HttpSetup } from 'src/core/public';
import { SavedObjectsManagementRecord } from 'src/plugins/saved_objects_management/public';
import { Space } from '../../common/model/space';
import { GetSpacePurpose } from '../../common/model/types';
import { CopySavedObjectsToSpaceResponse } from '../copy_saved_objects_to_space/types';

type SavedObject = Pick<SavedObjectsManagementRecord, 'type' | 'id'>;

export class SpacesManager {
  private activeSpace$: BehaviorSubject<Space | null> = new BehaviorSubject<Space | null>(null);

  private readonly serverBasePath: string;

  public readonly onActiveSpaceChange$: Observable<Space>;

  constructor(private readonly http: HttpSetup) {
    this.serverBasePath = http.basePath.serverBasePath;

    this.onActiveSpaceChange$ = this.activeSpace$
      .asObservable()
      .pipe(skipWhile((v: Space | null) => v == null)) as Observable<Space>;

    this.refreshActiveSpace();
  }

  public async getSpaces(purpose?: GetSpacePurpose): Promise<Space[]> {
    return await this.http.get('/api/spaces/space', { query: { purpose } });
  }

  public async getSpace(id: string): Promise<Space> {
    return await this.http.get(`/api/spaces/space/${encodeURIComponent(id)}`);
  }

  public getActiveSpace({ forceRefresh = false } = {}) {
    if (this.isAnonymousPath()) {
      throw new Error(`Cannot retrieve the active space for anonymous paths`);
    }
    if (!forceRefresh && this.activeSpace$.value) {
      return Promise.resolve(this.activeSpace$.value);
    }
    return this.http.get('/internal/spaces/_active_space') as Promise<Space>;
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

  public async copySavedObjects(
    objects: SavedObject[],
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
        ...(createNewCopies ? { createNewCopies } : { overwrite }),
      }),
    });
  }

  public async resolveCopySavedObjectsErrors(
    objects: SavedObject[],
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

  public async shareSavedObjectAdd(object: SavedObject, spaces: string[]): Promise<void> {
    return this.http.post(`/api/spaces/_share_saved_object_add`, {
      body: JSON.stringify({ object, spaces }),
    });
  }

  public async shareSavedObjectRemove(object: SavedObject, spaces: string[]): Promise<void> {
    return this.http.post(`/api/spaces/_share_saved_object_remove`, {
      body: JSON.stringify({ object, spaces }),
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
    const activeSpace = await this.getActiveSpace({ forceRefresh: true });
    this.activeSpace$.next(activeSpace);
  }

  private isAnonymousPath() {
    return this.http.anonymousPaths.isAnonymous(window.location.pathname);
  }
}
