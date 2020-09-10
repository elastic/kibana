/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import { decodeVersion } from '../utils/decode_version';
import { encodeHitVersion } from '../utils/encode_hit_version';
import {
  DescriptionOrUndefined,
  Id,
  ListSchema,
  MetaOrUndefined,
  NameOrUndefined,
  UpdateEsListSchema,
  VersionOrUndefined,
  _VersionOrUndefined,
} from '../../../common/schemas';

import { getList } from '.';

export interface UpdateListOptions {
  _version: _VersionOrUndefined;
  id: Id;
  callCluster: LegacyAPICaller;
  listIndex: string;
  user: string;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  dateNow?: string;
  version: VersionOrUndefined;
}

export const updateList = async ({
  _version,
  id,
  name,
  description,
  callCluster,
  listIndex,
  user,
  meta,
  dateNow,
  version,
}: UpdateListOptions): Promise<ListSchema | null> => {
  const updatedAt = dateNow ?? new Date().toISOString();
  const list = await getList({ callCluster, id, listIndex });
  if (list == null) {
    return null;
  } else {
    const calculatedVersion = version == null ? list.version + 1 : version;
    const doc: UpdateEsListSchema = {
      description,
      meta,
      name,
      updated_at: updatedAt,
      updated_by: user,
    };
    const response = await callCluster<CreateDocumentResponse>('update', {
      ...decodeVersion(_version),
      body: { doc },
      id,
      index: listIndex,
      refresh: 'wait_for',
    });
    return {
      _version: encodeHitVersion(response),
      created_at: list.created_at,
      created_by: list.created_by,
      description: description ?? list.description,
      deserializer: list.deserializer,
      id: response._id,
      immutable: list.immutable,
      meta,
      name: name ?? list.name,
      serializer: list.serializer,
      tie_breaker_id: list.tie_breaker_id,
      type: list.type,
      updated_at: updatedAt,
      updated_by: user,
      version: calculatedVersion,
    };
  }
};
