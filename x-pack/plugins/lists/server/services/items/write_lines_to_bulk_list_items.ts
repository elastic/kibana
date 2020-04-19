/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { Type, MetaOrUndefined } from '../../../common/schemas';
import { DataClient } from '../../types';

import { createListItemsBulk, getListItemsByValues, BufferLines } from '.';

interface ImportListItemsToStreamOptions {
  listId: string;
  stream: Readable;
  dataClient: DataClient;
  listsItemsIndex: string;
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

export const importListItemsToStream = ({
  listId,
  stream,
  dataClient,
  listsItemsIndex,
  type,
  user,
  meta,
}: ImportListItemsToStreamOptions): Promise<void> => {
  return new Promise<void>(resolve => {
    const readBuffer = new BufferLines({ input: stream });
    readBuffer.on('lines', async (lines: string[]) => {
      await writeBufferToItems({
        listId,
        dataClient,
        buffer: lines,
        listsItemsIndex,
        type,
        user,
        meta,
      });
    });

    readBuffer.on('close', () => {
      resolve();
    });
  });
};

interface WriteBufferToItemsOptions {
  listId: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  buffer: string[];
  type: Type;
  user: string;
  meta: MetaOrUndefined;
}

interface LinesResult {
  linesProcessed: number;
  duplicatesFound: number;
}

export const writeBufferToItems = async ({
  listId,
  dataClient,
  listsItemsIndex,
  buffer,
  type,
  user,
  meta,
}: WriteBufferToItemsOptions): Promise<LinesResult> => {
  const items = await getListItemsByValues({
    listId,
    dataClient,
    listsItemsIndex,
    type,
    value: buffer,
  });
  const duplicatesRemoved = buffer.filter(
    bufferedValue => !items.some(item => item.value === bufferedValue)
  );
  const linesProcessed = duplicatesRemoved.length;
  const duplicatesFound = buffer.length - duplicatesRemoved.length;
  await createListItemsBulk({
    listId,
    type,
    value: duplicatesRemoved,
    dataClient,
    listsItemsIndex,
    user,
    meta,
  });
  return { linesProcessed, duplicatesFound };
};
