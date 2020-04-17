/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { Type } from '../../../common/schemas';
import { DataClient } from '../../types';

import { createListItemsBulk, getListItemsByValues, BufferLines } from '.';

interface ImportListItemsToStreamOptions {
  listId: string;
  stream: Readable;
  dataClient: DataClient;
  listsItemsIndex: string;
  type: Type;
  user: string;
}

export const importListItemsToStream = ({
  listId,
  stream,
  dataClient,
  listsItemsIndex,
  type,
  user,
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
  });
  return { linesProcessed, duplicatesFound };
};
