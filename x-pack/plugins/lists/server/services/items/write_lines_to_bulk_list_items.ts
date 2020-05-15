/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { APICaller } from 'kibana/server';

import { MetaOrUndefined, Type } from '../../../common/schemas';

import { BufferLines } from './buffer_lines';
import { getListItemByValues } from './get_list_item_by_values';
import { createListItemsBulk } from './create_list_items_bulk';

export interface ImportListItemsToStreamOptions {
  listId: string;
  stream: Readable;
  callCluster: APICaller;
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
  type,
  user,
  meta,
}: ImportListItemsToStreamOptions): Promise<void> => {
  return new Promise<void>(resolve => {
    const readBuffer = new BufferLines({ input: stream });
    readBuffer.on('lines', async (lines: string[]) => {
      await writeBufferToItems({
        buffer: lines,
        callCluster,
        listId,
        listItemIndex,
        meta,
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
  callCluster: APICaller;
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
    bufferedValue => !items.some(item => item.value === bufferedValue)
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
