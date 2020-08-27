/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListItemSchema } from '../../../../../lists/common/shared_exports';
import { TrustedApp } from '../../../../common/endpoint/types';

/**
 * Map an ExcptionListItem to a TrustedApp item
 * @param exceptionListItem
 */
export const exceptionItemToTrustedAppItem = (
  exceptionListItem: ExceptionListItemSchema
): TrustedApp => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { entries, description, created_by, created_at, name, _tags, id } = exceptionListItem;
  const os = osFromTagsList(_tags);
  return {
    entries,
    description,
    created_at,
    created_by,
    name,
    os,
    id,
  } as TrustedApp;
};

/**
 * Retrieves the OS entry from a list of tags (property returned with ExcptionListItem).
 * For Trusted Apps each entry must have at MOST 1 OS.
 * */
const osFromTagsList = (tags: string[]): TrustedApp['os'] | 'unknown' => {
  for (const tag of tags) {
    if (tag.startsWith('os:')) {
      return tag.substr(3) as TrustedApp['os'];
    }
  }
  return 'unknown';
};
