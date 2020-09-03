/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ExceptionListItemSchema } from '../../../../../lists/common/shared_exports';
import { NewTrustedApp, TrustedApp } from '../../../../common/endpoint/types';
import { ExceptionListClient } from '../../../../../lists/server';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';

type NewExecptionItem = Parameters<ExceptionListClient['createExceptionListItem']>[0];

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

export const newTrustedAppItemToExceptionItem = ({
  os,
  entries,
  name,
  description = '',
}: NewTrustedApp): NewExecptionItem => {
  return {
    _tags: tagsListFromOs(os),
    comments: [],
    description,
    entries,
    itemId: uuid.v4(),
    listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
    meta: undefined,
    name,
    namespaceType: 'agnostic',
    tags: [],
    type: 'simple',
  };
};

const tagsListFromOs = (os: NewTrustedApp['os']): NewExecptionItem['_tags'] => {
  return [`os:${os}`];
};
