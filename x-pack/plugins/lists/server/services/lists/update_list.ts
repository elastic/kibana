/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  DescriptionOrUndefined,
  Id,
  ListSchema,
  MetaOrUndefined,
  NameOrUndefined,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { VersionOrUndefined } from '@kbn/securitysolution-io-ts-types';
import { decodeVersion, encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { UpdateEsListSchema } from '../../schemas/elastic_query';

import { getList } from '.';

export interface UpdateListOptions {
  _version: _VersionOrUndefined;
  id: Id;
  esClient: ElasticsearchClient;
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
  esClient,
  listIndex,
  user,
  meta,
  dateNow,
  version,
}: UpdateListOptions): Promise<ListSchema | null> => {
  const updatedAt = dateNow ?? new Date().toISOString();
  const list = await getList({ esClient, id, listIndex });
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
    const response = await esClient.update({
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
