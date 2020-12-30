/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  DescriptionOrUndefined,
  ExceptionListSchema,
  ExceptionListSoSchema,
  ExceptionListTypeOrUndefined,
  IdOrUndefined,
  ListIdOrUndefined,
  MetaOrUndefined,
  NameOrUndefined,
  NamespaceType,
  OsTypeArray,
  TagsOrUndefined,
  VersionOrUndefined,
  _VersionOrUndefined,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectUpdateToExceptionList } from './utils';
import { getExceptionList } from './get_exception_list';

interface UpdateExceptionListOptions {
  id: IdOrUndefined;
  _version: _VersionOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  osTypes: OsTypeArray;
  listId: ListIdOrUndefined;
  meta: MetaOrUndefined;
  user: string;
  tags: TagsOrUndefined;
  tieBreaker?: string;
  type: ExceptionListTypeOrUndefined;
  version: VersionOrUndefined;
}

export const updateExceptionList = async ({
  _version,
  id,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  listId,
  meta,
  user,
  tags,
  type,
  version,
}: UpdateExceptionListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionList = await getExceptionList({ id, listId, namespaceType, savedObjectsClient });
  if (exceptionList == null) {
    return null;
  } else {
    const calculatedVersion = version == null ? exceptionList.version + 1 : version;
    const savedObject = await savedObjectsClient.update<ExceptionListSoSchema>(
      savedObjectType,
      exceptionList.id,
      {
        description,
        meta,
        name,
        tags,
        type,
        updated_by: user,
        version: calculatedVersion,
      },
      {
        version: _version,
      }
    );
    return transformSavedObjectUpdateToExceptionList({ exceptionList, savedObject });
  }
};
