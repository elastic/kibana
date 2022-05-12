/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  DescriptionOrUndefined,
  ExceptionListSchema,
  ExceptionListTypeOrUndefined,
  IdOrUndefined,
  ListIdOrUndefined,
  MetaOrUndefined,
  NameOrUndefined,
  NamespaceType,
  TagsOrUndefined,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { VersionOrUndefined } from '@kbn/securitysolution-io-ts-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectUpdateToExceptionList } from './utils';
import { getExceptionList } from './get_exception_list';

interface UpdateExceptionListOptions {
  id: IdOrUndefined;
  _version: _VersionOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
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
