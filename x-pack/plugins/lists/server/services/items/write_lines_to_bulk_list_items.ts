/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { LegacyAPICaller } from 'kibana/server';

import { createListIfItDoesNotExist } from '../lists/create_list_if_it_does_not_exist';
import {
  DeserializerOrUndefined,
  ListIdOrUndefined,
  ListSchema,
  MetaOrUndefined,
  SerializerOrUndefined,
  Type,
} from '../../../common/schemas';
import { ConfigType } from '../../config';

import { BufferLines } from './buffer_lines';
import { createListItemsBulk } from './create_list_items_bulk';

export interface ImportListItemsToStreamOptions {
  listId: ListIdOrUndefined;
  config: ConfigType;
  listIndex: string;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  stream: Readable;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

export const importListItemsToStream = ({
  config,
  deserializer,
  serializer,
  listId,
  stream,
  callCluster,
  listItemIndex,
  listIndex,
  type,
  user,
  meta,
}: ImportListItemsToStreamOptions): Promise<ListSchema | null> => {
  return new Promise<ListSchema | null>((resolve) => {
    const readBuffer = new BufferLines({ bufferSize: config.importBufferSize, input: stream });
    let fileName: string | undefined;
    let list: ListSchema | null = null;
    readBuffer.on('fileName', async (fileNameEmitted: string) => {
      readBuffer.pause();
      fileName = fileNameEmitted;
      if (listId == null) {
        list = await createListIfItDoesNotExist({
          callCluster,
          description: `File uploaded from file system of ${fileNameEmitted}`,
          deserializer,
          id: fileNameEmitted,
          listIndex,
          meta,
          name: fileNameEmitted,
          serializer,
          type,
          user,
        });
      }
      readBuffer.resume();
    });

    readBuffer.on('lines', async (lines: string[]) => {
      if (listId != null) {
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
      } else if (fileName != null) {
        await writeBufferToItems({
          buffer: lines,
          callCluster,
          deserializer,
          listId: fileName,
          listItemIndex,
          meta,
          serializer,
          type,
          user,
        });
      }
    });

    readBuffer.on('close', () => {
      resolve(list);
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
