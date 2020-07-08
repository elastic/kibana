/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { LegacyAPICaller } from 'kibana/server';

import {
  DeserializerOrUndefined,
  MetaOrUndefined,
  SerializerOrUndefined,
  Type,
} from '../../../common/schemas';

import { BufferLines } from './buffer_lines';
import { createListItemsBulk } from './create_list_items_bulk';

export interface ImportListItemsToStreamOptions {
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  listId: string;
  stream: Readable;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

export const importListItemsToStream = ({
  deserializer,
  serializer,
  listId,
  stream,
  callCluster,
  listItemIndex,
  type,
  user,
  meta,
}: ImportListItemsToStreamOptions): Promise<void> => {
  return new Promise<void>((resolve) => {
    const readBuffer = new BufferLines({ input: stream });
    readBuffer.on('lines', async (lines: string[]) => {
      await writeBufferToItems({
        buffer: lines,
        callCluster,
        deserializer,
        listId,
        listItemIndex,
        meta,
        serializer,
        type,
        user,
      });
    });

    readBuffer.on('close', () => {
      resolve();
    });
  });
};

export interface WriteBufferToItemsOptions {
  listId: string;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  buffer: string[];
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

export interface LinesResult {
  linesProcessed: number;
}

export const writeBufferToItems = async ({
  listId,
  callCluster,
  deserializer,
  serializer,
  listItemIndex,
  buffer,
  type,
  user,
  meta,
}: WriteBufferToItemsOptions): Promise<LinesResult> => {
  await createListItemsBulk({
    callCluster,
    deserializer,
    listId,
    listItemIndex,
    meta,
    serializer,
    type,
    user,
    value: buffer,
  });
  return { linesProcessed: buffer.length };
};
