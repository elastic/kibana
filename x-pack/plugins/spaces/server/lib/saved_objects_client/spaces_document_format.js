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

  toDocumentId(type, id) {
    const spacePrefix = this._shouldPrependSpace(type) ? `${this._spaceId}:` : '';
    return `${type}:${spacePrefix}${id || uuid.v1()}`;
  }

  fromDocumentId(type, id) {
    return trimPrefix(trimPrefix(id, type), this._spaceId);
  }

  toDocumentSourceType(type) {
    const prefix = this._shouldPrependSpace(type) ? `${this._spaceId}:` : '';
    return `${prefix}${type}`;
  }

  fromDocumentSourceType(type) {
    return trimPrefix(type, this._spaceId);
  }

  _shouldPrependSpace(type) {
    return isTypeSpaceAware(type) && this._spaceId !== DEFAULT_SPACE_ID;
  }
}
