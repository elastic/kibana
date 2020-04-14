/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { ScopedClusterClient } from 'kibana/server';

import { Type } from '../../common/schemas';

import { createListItemsBulk, getListItemsByValues, BufferLines } from '.';

interface LinesResult {
  linesProcessed: number;
  duplicatesFound: number;
}

export const writeLinesToBulkListItems = ({
  listId,
  stream,
  clusterClient,
  listsItemsIndex,
  type,
}: {
  listId: string;
  stream: Readable;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  type: Type;
}): Promise<void> => {
  return new Promise<void>(resolve => {
    const readBuffer = new BufferLines({ input: stream });
    readBuffer.on('lines', async (lines: string[]) => {
      await writeBufferToItems({
        listId,
        clusterClient,
        buffer: lines,
        listsItemsIndex,
        type,
      });
    });

    readBuffer.on('close', () => {
      resolve();
    });
  });
};

export const writeBufferToItems = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  buffer,
  type,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  buffer: string[];
  type: Type;
}): Promise<LinesResult> => {
  const items = await getListItemsByValues({
    listId,
    clusterClient,
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
    clusterClient,
    listsItemsIndex,
  });
  return { linesProcessed, duplicatesFound };
};
