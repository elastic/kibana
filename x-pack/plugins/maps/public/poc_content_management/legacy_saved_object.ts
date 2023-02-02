/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { get, has } from 'lodash';
import type { SavedObject as SavedObjectType } from '@kbn/core-saved-objects-common';

/**
 * Core internal implementation of {@link SimpleSavedObject}
 *
 * @internal Should use the {@link SimpleSavedObject} interface instead
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export class SimpleSavedObjectImpl<T = any> {
  public attributes: T;
  public _version?: SavedObjectType<T>['version'];
  public id: SavedObjectType<T>['id'];
  public type: SavedObjectType<T>['type'];
  public migrationVersion: SavedObjectType<T>['migrationVersion'];
  public coreMigrationVersion: SavedObjectType<T>['coreMigrationVersion'];
  public error: SavedObjectType<T>['error'];
  public references: SavedObjectType<T>['references'];
  public updatedAt: SavedObjectType<T>['updated_at'];
  public createdAt: SavedObjectType<T>['created_at'];
  public namespaces: SavedObjectType<T>['namespaces'];

  constructor({
    id,
    type,
    version,
    attributes,
    error,
    references,
    migrationVersion,
    coreMigrationVersion,
    namespaces,
    updated_at: updatedAt,
    created_at: createdAt,
  }: SavedObjectType<T>) {
    this.id = id;
    this.type = type;
    this.attributes = attributes || ({} as T);
    this.references = references || [];
    this._version = version;
    this.migrationVersion = migrationVersion;
    this.coreMigrationVersion = coreMigrationVersion;
    this.namespaces = namespaces;
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;
    if (error) {
      this.error = error;
    }
  }

  public get(key: string): any {
    return get(this.attributes, key);
  }

  public set(key: string, value: any): T {
    return set(this.attributes as any, key, value);
  }

  public has(key: string): boolean {
    return has(this.attributes, key);
  }
}
