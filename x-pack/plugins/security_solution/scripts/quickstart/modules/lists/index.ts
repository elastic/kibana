/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListType } from '@kbn/securitysolution-lists-common/api';
import type { Client as ListsClient } from '@kbn/securitysolution-lists-common/api/quickstart_client.gen';

export const importListItemsWrapper = ({
  listsClient,
  listName,
  listFileType,
  listItems,
  listType,
}: {
  listsClient: ListsClient;
  listName: string;
  listFileType: 'txt' | 'csv';
  listItems: unknown[];
  listType: ListType;
}) => {
  const blobbyBaratheon = new Blob([listItems.join('\r\n')], { type: 'application/json' });
  const body = new FormData();
  body.append('file', blobbyBaratheon, `${listName}.${listFileType}`);
  return listsClient.importListItems({ query: { type: listType }, attachment: body });
};
