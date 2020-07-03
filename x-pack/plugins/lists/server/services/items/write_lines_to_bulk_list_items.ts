/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { LegacyAPICaller } from 'kibana/server';

import { ListIdOrUndefined, ListSchema, MetaOrUndefined, Type } from '../../../common/schemas';
import { createListIfItDoesNotExist } from '../lists/create_list_if_it_does_not_exist';

import { BufferLines } from './buffer_lines';
import { getListItemByValues } from './get_list_item_by_values';
import { createListItemsBulk } from './create_list_items_bulk';

export interface ImportListItemsToStreamOptions {
  listId: ListIdOrUndefined;
  listIndex: string;
  stream: Readable;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

export const importListItemsToStream = ({
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
    const readBuffer = new BufferLines({ input: stream });
    let fileName: string | undefined;
    let list: ListSchema | null = null;
    readBuffer.on('fileName', async (fileNameEmitted: string) => {
      readBuffer.pause();
      fileName = fileNameEmitted;
      if (listId == null) {
        list = await createListIfItDoesNotExist({
          callCluster,
          description: `File uploaded from file system of ${fileNameEmitted}`,
          id: fileNameEmitted,
          listIndex,
          meta,
          name: fileNameEmitted,
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
          listId,
          listItemIndex,
          meta,
          type,
          user,
        });
      } else if (fileName != null) {
        await writeBufferToItems({
          buffer: lines,
          callCluster,
          listId: fileName,
          listItemIndex,
          meta,
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
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  buffer: string[];
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

export interface LinesResult {
  linesProcessed: number;
  duplicatesFound: number;
}

export const writeBufferToItems = async ({
  listId,
  callCluster,
  listItemIndex,
  buffer,
  type,
  user,
  meta,
}: WriteBufferToItemsOptions): Promise<LinesResult> => {
  const items = await getListItemByValues({
    callCluster,
    listId,
    listItemIndex,
    type,
    value: buffer,
  });
  const duplicatesRemoved = buffer.filter(
    (bufferedValue) => !items.some((item) => item.value === bufferedValue)
  );
  const linesProcessed = duplicatesRemoved.length;
  const duplicatesFound = buffer.length - duplicatesRemoved.length;
  await createListItemsBulk({
    callCluster,
    listId,
    listItemIndex,
    meta,
    type,
    user,
    value: duplicatesRemoved,
  });
  return { duplicatesFound, linesProcessed };
};
