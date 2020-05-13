/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsUpdateResponse } from 'kibana/server';

import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListSoSchema,
} from '../../../common/schemas';
import {
  SavedObjectType,
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
} from '../../saved_objects';

import { NamespaceType } from './types';

export const getSavedObjectType = ({
  namespaceType,
}: {
  namespaceType: NamespaceType;
}): SavedObjectType => {
  if (namespaceType === 'agnostic') {
    return exceptionListAgnosticSavedObjectType;
  } else {
    return exceptionListSavedObjectType;
  }
};

export const transformSavedObjectToExceptionList = ({
  savedObject,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    attributes: {
      _tags,
      created_at,
      created_by,
      description,
      list_id,
      meta,
      name,
      tags,
      tie_breaker_id,
      type,
      updated_by,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _tags,
    created_at,
    created_by,
    description,
    id,
    list_id,
    meta,
    name,
    tags,
    tie_breaker_id,
    type,
    updated_at: updatedAt ?? dateNow,
    updated_by,
  };
};

export const transformSavedObjectUpdateToExceptionList = ({
  list,
  savedObject,
}: {
  list: ExceptionListSchema;
  savedObject: SavedObjectsUpdateResponse<ExceptionListSoSchema>;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    attributes: { _tags, description, meta, name, tags, type, updated_by: updatedBy },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _tags: _tags ?? list._tags,
    created_at: list.created_at,
    created_by: list.created_by,
    description: description ?? list.description,
    id,
    list_id: list.list_id,
    meta: meta ?? list.meta,
    name: name ?? list.name,
    tags: tags ?? list.tags,
    tie_breaker_id: list.tie_breaker_id,
    type: type ?? list.type,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? list.updated_by,
  };
};

export const transformSavedObjectToExceptionListItem = ({
  savedObject,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
}): ExceptionListItemSchema => {
  const dateNow = new Date().toISOString();
  const {
    attributes: {
      _tags,
      comment,
      created_at,
      created_by,
      description,
      entries,
      item_id: itemId,
      list_id,
      meta,
      name,
      tags,
      tie_breaker_id,
      type,
      updated_by,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;
  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: item"
  // TODO: Do a throw if item_id or entries is not defined.
  return {
    _tags,
    comment,
    created_at,
    created_by,
    description,
    entries: entries ?? [],
    id,
    item_id: itemId ?? '(unknown)',
    list_id,
    meta,
    name,
    tags,
    tie_breaker_id,
    type,
    updated_at: updatedAt ?? dateNow,
    updated_by,
  };
};
