/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { isTypeSpaceAware } from './lib/is_type_space_aware';

function assertNonEmptyString(value, name) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`Expected "${value}" to be a ${name}`);
  }
}

/**
 *  Trim the prefix from the id of a saved object doc
 *
 *  @param  {string} id
 *  @param  {string} type
 *  @return {string}
 */
function trimPrefix(id, prefix) {
  assertNonEmptyString(id, 'document id');
  assertNonEmptyString(prefix, 'prefix');

  const prefixStr = `${prefix}:`;

  if (!id.startsWith(prefixStr)) {
    return id;
  }

  return id.slice(prefixStr.length);
}

export class SpacesDocumentFormat {
  constructor(spaceId) {
    this._spaceId = spaceId;
  }

  fromDocument({
    extraDocumentProperties,
    doc
  }) {
    const { type: sourceType, updated_at: updatedAt } = doc._source;
    const type = this.fromDocumentSourceType(sourceType);

    return {
      id: this.fromDocumentId(type, doc._id),
      type,
      ...updatedAt && { updated_at: updatedAt },
      version: doc._version,
      ...extraDocumentProperties
        .map(s => ({ [s]: doc._source[s] }))
        .reduce((acc, prop) => ({ ...acc, ...prop }), {}),
      attributes: {
        ...doc._source[type],
      },
    };
  }

  fromDocumentSourceType(type) {
    return trimPrefix(type, this._spaceId);
  }

  fromDocumentId(type, id) {
    return trimPrefix(trimPrefix(id, type), this._spaceId);
  }

  toDocumentId(type, id) {
    const spacePrefix = this._shouldPrependSpace(type) ? `${this._spaceId}:` : '';
    return `${type}:${spacePrefix}${id || uuid.v1()}`;
  }

  toDocumentSource({
    type,
    extraDocumentProperties,
    updatedAt,
    attributes
  }) {
    return {
      ...extraDocumentProperties,
      type: this.toDocumentSourceType(type),
      updated_at: updatedAt,
      [type]: attributes,
    };
  }

  toDocumentSourceType(type) {
    const prefix = this._shouldPrependSpace(type) ? `${this._spaceId}:` : '';
    return `${prefix}${type}`;
  }

  _shouldPrependSpace(type) {
    return isTypeSpaceAware(type) && this._spaceId !== DEFAULT_SPACE_ID;
  }
}
